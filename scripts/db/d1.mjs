import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadPlatformEnvironment } from '../environment.mjs';
import { loadDatabaseSeeds } from '../database-seeds.mjs';
import { createD1Client, sqlLiteral } from './d1-client.mjs';

const action = process.argv[2];
if (!['seed', 'status', 'doctor'].includes(action ?? ''))
  throw new Error('D1 database action must be seed, status, or doctor');
await loadPlatformEnvironment('cloudflare', new URL('../../../', import.meta.url));
const root = resolve(import.meta.dirname, '../..');
const config = resolve(root, process.argv[3] || 'dist/workers/server/wrangler.json');
const client = createD1Client(root, config);
const seeds = await loadDatabaseSeeds(root);

if (action === 'seed') {
  const status = inspectSeeds();
  for (const seed of seeds.filter((item) => status.pending.includes(item.key))) {
    // D1 的远程 Execute API 会原子执行同一批语句，且禁止显式事务语句。
    client.command(`${seed.sql};insert into database_seed_records (seed_key,checksum,applied_at) values (${sqlLiteral(seed.key)},${sqlLiteral(seed.checksum)},${sqlLiteral(new Date().toISOString())})`);
  }
  output('database_seeded', { applied: status.pending.length, total: seeds.length });
} else {
  const migration = await inspectMigrations();
  const seed = inspectSeeds();
  const result = { currentVersion: migration.currentVersion, pendingMigrations: migration.pending, seedsApplied: seeds.length - seed.pending.length, pendingSeeds: seed.pending };
  if (action === 'doctor') {
    if (migration.pending.length) throw new Error(`D1 has pending migrations: ${migration.pending.join(', ')}`);
    if (seed.pending.length) throw new Error(`D1 has pending Seeds: ${seed.pending.join(', ')}`);
    const integrity = String(client.query('pragma quick_check')[0]?.quick_check ?? '');
    if (integrity !== 'ok') throw new Error('D1 integrity check failed');
    output('database_doctor_completed', { ...result, integrity });
  } else output('database_status', result);
}

async function inspectMigrations() {
  const directory = resolve(root, 'database/migrations/versions');
  const names = await readdir(directory).catch((error) => {
    if (error?.code === 'ENOENT') return [];
    throw error;
  });
  const migrations = await Promise.all(names.filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort().map(async (file) => {
    const content = await readFile(resolve(directory, file), 'utf8');
    return { version: file.slice(0, 4), checksum: createHash('sha256').update(content).digest('hex') };
  }));
  const applied = new Map(client.query('select version,checksum from system_migration_versions order by version').map((row) => [String(row.version), String(row.checksum)]));
  const baselineVersion = (await readFile(resolve(root, 'database/migrations/BASELINE_VERSION'), 'utf8')).trim();
  const folded = Array.from({ length: Number(baselineVersion) }, (_, index) => String(index + 1).padStart(4, '0'));
  const known = new Set(['0000', ...folded, ...migrations.map((item) => item.version)]);
  const unknown = [...applied.keys()].filter((version) => !known.has(version));
  if (unknown.length) throw new Error(`D1 contains unknown migrations: ${unknown.join(', ')}`);
  for (const migration of migrations) {
    const checksum = applied.get(migration.version);
    if (checksum && checksum !== migration.checksum) throw new Error(`Migration checksum changed: ${migration.version}`);
  }
  return { currentVersion: [...applied.keys()].at(-1) ?? null, pending: migrations.filter((item) => !applied.has(item.version)).map((item) => item.version) };
}

function inspectSeeds() {
  const applied = new Map(client.query('select seed_key,checksum from database_seed_records order by seed_key').map((row) => [String(row.seed_key), String(row.checksum)]));
  const known = new Set(seeds.map((seed) => seed.key));
  const unknown = [...applied.keys()].filter((key) => !known.has(key));
  if (unknown.length) throw new Error(`D1 contains unknown Seeds: ${unknown.join(', ')}`);
  for (const seed of seeds) {
    const checksum = applied.get(seed.key);
    if (checksum && checksum !== seed.checksum) throw new Error(`Seed checksum changed: ${seed.key}`);
  }
  return { pending: seeds.filter((seed) => !applied.has(seed.key)).map((seed) => seed.key) };
}

function output(event, result) {
  console.info(JSON.stringify({ event, target: 'cloudflare', result }));
}
