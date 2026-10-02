import assert from 'node:assert/strict';
import test from 'node:test';
import BetterSqlite3 from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { applicationDatabaseSchema } from "../database/schema/application";
import { renderSqlSchema } from '@/function/common/db/schema';
import { applySqliteSeeds, loadDatabaseSeeds } from '../scripts/database-seeds.mjs';

test('a site without seed files loads an empty seed set', async () => {
  const seeds = await loadDatabaseSeeds(fileURLToPath(new URL('..', import.meta.url)));
  assert.deepEqual(seeds, []);
});

test('applying no seeds records nothing and stays idempotent', () => {
  const database = new BetterSqlite3(':memory:');
  database.exec(renderSqlSchema(applicationDatabaseSchema));
  assert.deepEqual(applySqliteSeeds(database, [], '2026-01-01T00:00:00.000Z'), { applied: 0, total: 0 });
  assert.deepEqual(applySqliteSeeds(database, []), { applied: 0, total: 0 });
  assert.equal(database.prepare('select count(*) as count from database_seed_records').get().count, 0);
  database.close();
});
