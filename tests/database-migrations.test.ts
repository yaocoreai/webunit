import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateSqlite, loadMigrations } from "../scripts/database-migrations.mts";
import { readBaselineVersion } from "../scripts/database-baseline.mts";

const root = fileURLToPath(new URL("..", import.meta.url));
const keptTables = [
  "system_migration_versions",
  "system_migration_lock",
  "database_seed_records",
  "config_records",
];

test("SQLite migration runner initializes, reopens idempotently and rejects unknown versions", async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), "webunit-migration-test-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const database = new Database(resolve(directory, "site.sqlite"));
  const baselineVersion = await readBaselineVersion(root);
  const migrations = await loadMigrations(root);
  const first = await migrateSqlite(database, root),
    second = await migrateSqlite(database, root);
  assert.equal(
    first.currentVersion,
    migrations.at(-1)?.version ?? baselineVersion,
  );
  assert.deepEqual(second.applied, []);
  for (const table of keptTables) {
    assert.ok(
      database
        .prepare(
          "select 1 from sqlite_master where type='table' and name=?",
        )
        .get(table),
      table,
    );
  }
  database
    .prepare(
      "insert into system_migration_versions (version,name,checksum,execution_ms,applied_at) values ('9999','unknown','x',0,?)",
    )
    .run(new Date().toISOString());
  await assert.rejects(() => migrateSqlite(database, root), /unknown migrations/);
  database.close();
});

test("legacy databases without migration state cannot bootstrap after baseline compact", async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), "webunit-cutover-test-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const database = new Database(resolve(directory, "legacy.sqlite"));
  database.exec(
    "create table config_records (id text primary key); insert into config_records values ('legacy')",
  );
  await assert.rejects(
    () => migrateSqlite(database, root),
    /Legacy database requires migration 0001/,
  );
  database.close();
});
