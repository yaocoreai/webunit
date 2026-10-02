import Database from "better-sqlite3";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  compactVersionFiles,
  dumpSqliteSchemaSql,
  listMigrationFiles,
  readBaselineVersion,
  writeBaselineVersion,
} from "../database-baseline.mts";
import { migrateSqlite } from "../database-migrations.mts";

const root = resolve(import.meta.dirname, "../..");
const previousBaseline = await readBaselineVersion(root);
const files = await listMigrationFiles(root);
if (!files.length) {
  console.info(
    JSON.stringify({
      event: "database_migrations_compacted",
      removed: [],
      baselineVersion: previousBaseline,
    }),
  );
  process.exit(0);
}

const database = new Database(":memory:");
try {
  const migrated = await migrateSqlite(database, root);
  for (const file of files) {
    const sql = await readFile(
      resolve(root, "database/migrations/versions", file),
      "utf8",
    );
    const triggerSql = triggerScript(sql);
    if (triggerSql) database.exec(triggerSql);
  }
  const statements = database
    .prepare(
      "select sql from sqlite_master where sql is not null and name not like 'sqlite_%' order by rowid",
    )
    .pluck()
    .all() as string[];
  await writeFile(
    resolve(root, "database/migrations/0000_initial.sql"),
    dumpSqliteSchemaSql(statements),
  );
  const lastFileVersion = files.at(-1)?.slice(0, 4);
  const baselineVersion = [
    previousBaseline,
    migrated.currentVersion,
    lastFileVersion,
  ]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)!;
  await writeBaselineVersion(root, baselineVersion);
  const removed = await compactVersionFiles(root);
  console.info(
    JSON.stringify({
      event: "database_migrations_compacted",
      baselineVersion,
      removed,
    }),
  );
} finally {
  database.close();
}

function triggerScript(sql: string) {
  const start = sql.search(/CREATE TRIGGER/i);
  if (start < 0) return null;
  return sql.slice(start).replace(
    /CREATE TRIGGER(?!\s+IF NOT EXISTS)/gi,
    "CREATE TRIGGER IF NOT EXISTS",
  );
}
