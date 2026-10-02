import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { applicationDatabaseSchema } from "../database/schema/application";
import { migrateSqlite } from "./database-migrations.mts";
import { applySqliteSeeds, loadDatabaseSeeds } from "./database-seeds.mjs";

const file = resolve(
  process.env.WEB_DATABASE_FILE ??
    resolve(import.meta.dirname, "../../.data/node/site.sqlite"),
);
mkdirSync(dirname(file), { recursive: true });
const database = new Database(file);
try {
  const expected = applicationDatabaseSchema.map((table) => table.name);
  const migration = await migrateSqlite(
    database,
    resolve(import.meta.dirname, ".."),
  );
  const existing = new Set(
    database
      .prepare(
        "select name from sqlite_master where type='table' and name not like 'sqlite_%'",
      )
      .all()
      .map((row) => String((row as { name: unknown }).name)),
  );
  const missing = expected.filter((name) => !existing.has(name));
  if (missing.length)
    throw new Error(
      `Database migration completed with missing tables: ${missing.join(", ")}`,
    );
  const seeds = applySqliteSeeds(
    database,
    await loadDatabaseSeeds(resolve(import.meta.dirname, "..")),
  );
  console.log(
    JSON.stringify({
      event: "node_database_ready",
      file,
      tables: expected.length,
      migration,
      seeds,
    }),
  );
} finally {
  database.close();
}
