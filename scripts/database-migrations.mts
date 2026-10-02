import Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  foldedVersions,
  knownMigrationVersions,
  readBaselineVersion,
} from "./database-baseline.mts";

export type MigrationResult = Readonly<{
  currentVersion: string;
  applied: readonly string[];
  pending: readonly string[];
}>;

export async function migrateSqlite(
  database: Database.Database,
  root: string,
): Promise<MigrationResult> {
  const baseline = await readFile(
      resolve(root, "database/migrations/0000_initial.sql"),
      "utf8",
    ),
    baselineVersion = await readBaselineVersion(root),
    migrations = await loadMigrations(root),
    existing = database
      .prepare(
        "select name from sqlite_master where type='table' and name not like 'sqlite_%'",
      )
      .all() as Array<{ name: string }>,
    fresh = existing.length === 0,
    applied: string[] = [];
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  if (fresh) {
    const folded = foldedVersions(baselineVersion);
    const byVersion = new Map(migrations.map((item) => [item.version, item]));
    database.transaction(() => {
      database.exec(baseline);
      record(database, "0000", "initial", checksum(baseline), 0);
      for (const version of folded) {
        const migration = byVersion.get(version);
        if (migration)
          record(
            database,
            migration.version,
            migration.name,
            migration.checksum,
            0,
          );
        else record(database, version, "folded", "folded", 0);
      }
      for (const migration of migrations) {
        if (migration.version <= baselineVersion) continue;
        database.exec(migration.sql);
        record(
          database,
          migration.version,
          migration.name,
          migration.checksum,
          0,
        );
      }
    })();
    const currentVersion = migrations.at(-1)?.version ?? baselineVersion;
    return {
      currentVersion,
      applied: [
        "0000",
        ...folded,
        ...migrations
          .filter((item) => item.version > baselineVersion)
          .map((item) => item.version),
      ],
      pending: [],
    };
  }

  if (!hasTable(database, "system_migration_versions")) {
    const bootstrap = migrations[0];
    if (!bootstrap || bootstrap.version !== "0001")
      throw new Error("Legacy database requires migration 0001");
    const started = Date.now();
    database.transaction(() => {
      database.exec(bootstrap.sql);
      record(database, "0000", "legacy-baseline", "legacy", 0);
      record(
        database,
        bootstrap.version,
        bootstrap.name,
        bootstrap.checksum,
        Date.now() - started,
      );
    })();
    applied.push(bootstrap.version);
  }

  const owner = randomUUID(),
    now = new Date(),
    expires = new Date(now.getTime() + 120_000);
  const lock = database
    .prepare(
      "insert into system_migration_lock (lock_key,owner_id,expires_at,updated_at) values ('schema',?,?,?) on conflict(lock_key) do update set owner_id=excluded.owner_id,expires_at=excluded.expires_at,updated_at=excluded.updated_at where system_migration_lock.expires_at<=excluded.updated_at",
    )
    .run(owner, expires.toISOString(), now.toISOString());
  const currentLock = database
    .prepare(
      "select owner_id from system_migration_lock where lock_key='schema'",
    )
    .get() as { owner_id: string } | undefined;
  if (!lock.changes && currentLock?.owner_id !== owner)
    throw new Error("Database migration lock is held by another executor");
  try {
    const versions = new Map(
      (
        database
          .prepare("select version,checksum from system_migration_versions")
          .all() as Array<{ version: string; checksum: string }>
      ).map((row) => [row.version, row.checksum]),
    );
    assertRecordedMigrations(versions, migrations, baselineVersion);
    for (const migration of migrations) {
      const recorded = versions.get(migration.version);
      if (recorded && recorded !== migration.checksum)
        throw new Error(`Migration checksum changed: ${migration.version}`);
      if (recorded) continue;
      const started = Date.now();
      database.transaction(() => {
        assertMigrationPreconditions(database, migration.version);
        database.exec(migration.sql);
        record(
          database,
          migration.version,
          migration.name,
          migration.checksum,
          Date.now() - started,
        );
      })();
      applied.push(migration.version);
    }
  } finally {
    database
      .prepare(
        "delete from system_migration_lock where lock_key='schema' and owner_id=?",
      )
      .run(owner);
  }
  const rows = database
    .prepare("select version from system_migration_versions order by version")
    .all() as Array<{ version: string }>;
  return {
    currentVersion: rows.at(-1)?.version ?? "0000",
    applied,
    pending: [],
  };
}

function assertMigrationPreconditions(
  database: Database.Database,
  version: string,
) {
  if (version !== "0002") return;
  for (const table of ["cms_localized_contents", "cms_translation_leaves"]) {
    if (!hasTable(database, table)) continue;
    const row = database
      .prepare(`select count(*) as count from ${table}`)
      .get() as { count: number };
    if (Number(row.count) > 0)
      throw new Error(
        `Migration 0002 requires legacy Translation export before cutover: ${table} contains ${row.count} records`,
      );
  }
}

export function assertRecordedMigrations(
  recorded: ReadonlyMap<string, string>,
  migrations: readonly { version: string; checksum: string }[],
  baselineVersion: string,
) {
  const known = knownMigrationVersions(
    baselineVersion,
    migrations.map((item) => item.version),
  );
  const unknown = [...recorded.keys()].filter((version) => !known.has(version));
  if (unknown.length)
    throw new Error(`Database contains unknown migrations: ${unknown.join(", ")}`);
  for (const migration of migrations) {
    const checksum = recorded.get(migration.version);
    if (checksum && checksum !== migration.checksum)
      throw new Error(`Migration checksum changed: ${migration.version}`);
  }
}

export async function loadMigrations(root: string) {
  const directory = resolve(root, "database/migrations/versions"),
    names = (
      await readdir(directory).catch((error) => {
        if (error?.code === "ENOENT") return [] as string[];
        throw error;
      })
    )
      .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
      .sort();
  const versions = names.map((name) => name.slice(0, 4));
  if (new Set(versions).size !== versions.length)
    throw new Error("Migration versions must be unique");
  return Promise.all(
    names.map(async (file) => {
      const sql = await readFile(resolve(directory, file), "utf8");
      return {
        version: file.slice(0, 4),
        name: file.slice(5, -4),
        sql,
        checksum: checksum(sql),
      };
    }),
  );
}
function record(
  database: Database.Database,
  version: string,
  name: string,
  hash: string,
  executionMs: number,
) {
  database
    .prepare(
      "insert into system_migration_versions (version,name,checksum,execution_ms,applied_at) values (?,?,?,?,?)",
    )
    .run(version, name, hash, executionMs, new Date().toISOString());
}
function hasTable(database: Database.Database, name: string) {
  return Boolean(
    database
      .prepare("select 1 from sqlite_master where type='table' and name=?")
      .get(name),
  );
}
function checksum(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
