import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadPlatformEnvironment } from "../environment.mjs";
import { applicationDatabaseSchema } from "../../database/schema/application";
import { assertRecordedMigrations, migrateSqlite, loadMigrations } from "../database-migrations.mts";
import { readBaselineVersion } from "../database-baseline.mts";
import { applySqliteSeeds, loadDatabaseSeeds } from "../database-seeds.mjs";

const action = process.argv[2];
const target = process.argv[3] ?? "node";
if (!['migrate', 'seed', 'status', 'doctor'].includes(action ?? ''))
  throw new Error('Database action must be migrate, seed, status, or doctor');
if (!['node', 'container'].includes(target))
  throw new Error('SQLite database target must be node or container');

const root = resolve(import.meta.dirname, '../..');
await loadPlatformEnvironment(target, new URL('../../../', import.meta.url));
const defaultFile = resolve(import.meta.dirname, "../../../.data/node/site.sqlite");
const file = resolve(process.env.WEB_DATABASE_FILE ?? defaultFile);
mkdirSync(dirname(file), { recursive: true });
const database = new Database(file);

try {
  database.pragma('foreign_keys = ON');
  if (action === 'migrate') {
    output('database_migrated', await migrateSqlite(database, root));
  } else if (action === 'seed') {
    requireTable(database, 'database_seed_records');
    output('database_seeded', applySqliteSeeds(database, await loadDatabaseSeeds(root)));
  } else {
    const status = await inspect(database, root);
    if (action === 'status') output('database_status', status);
    else {
      const integrity = database.pragma('integrity_check') as Array<{ integrity_check: string }>;
      if (integrity.length !== 1 || integrity[0]?.integrity_check !== 'ok')
        throw new Error('SQLite integrity check failed');
      const expectedTables = applicationDatabaseSchema.map((table) => table.name);
      const actualTables = tableNames(database);
      const missingTables = expectedTables.filter((table) => !actualTables.has(table));
      if (missingTables.length) throw new Error(`Database is missing tables: ${missingTables.join(', ')}`);
      if (status.pendingMigrations.length) throw new Error(`Database has pending migrations: ${status.pendingMigrations.join(', ')}`);
      if (status.pendingSeeds.length) throw new Error(`Database has pending Seeds: ${status.pendingSeeds.join(', ')}`);
      output('database_doctor_completed', { ...status, integrity: 'ok', tables: expectedTables.length });
    }
  }
} finally {
  database.close();
}

async function inspect(database: Database.Database, root: string) {
  requireTable(database, 'system_migration_versions');
  requireTable(database, 'database_seed_records');
  const migrations = await loadMigrations(root);
  const recordedMigrations = new Map(
    (database.prepare('select version,checksum from system_migration_versions order by version').all() as Array<{ version: string; checksum: string }>)
      .map((row) => [row.version, row.checksum]),
  );
  assertRecordedMigrations(recordedMigrations, migrations, await readBaselineVersion(root));

  const seeds = await loadDatabaseSeeds(root);
  const recordedSeeds = new Map(
    (database.prepare('select seed_key,checksum from database_seed_records order by seed_key').all() as Array<{ seed_key: string; checksum: string }>)
      .map((row) => [row.seed_key, row.checksum]),
  );
  for (const seed of seeds) {
    const checksum = recordedSeeds.get(seed.key);
    if (checksum && checksum !== seed.checksum)
      throw new Error(`Seed checksum changed: ${seed.key}`);
  }
  const knownSeeds = new Set(seeds.map((seed) => seed.key));
  const unknownSeeds = [...recordedSeeds.keys()].filter((key) => !knownSeeds.has(key));
  if (unknownSeeds.length) throw new Error(`Database contains unknown Seeds: ${unknownSeeds.join(', ')}`);
  return {
    currentVersion: [...recordedMigrations.keys()].at(-1) ?? null,
    pendingMigrations: migrations.filter((item) => !recordedMigrations.has(item.version)).map((item) => item.version),
    seedsApplied: recordedSeeds.size,
    pendingSeeds: seeds.filter((item) => !recordedSeeds.has(item.key)).map((item) => item.key),
  };
}

function tableNames(database: Database.Database) {
  return new Set((database.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%'").all() as Array<{ name: string }>).map((row) => row.name));
}

function requireTable(database: Database.Database, table: string) {
  if (!tableNames(database).has(table)) throw new Error(`Database migration is required before ${action}: missing ${table}`);
}

function output(event: string, result: unknown) {
  console.info(JSON.stringify({ event, target, file, result }));
}
