import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadPlatformEnvironment } from "./environment.mjs";

await loadPlatformEnvironment("node", new URL("../../", import.meta.url));
const root = resolve(import.meta.dirname, ".."),
  source = resolve(
    option("database") ??
      process.env.WEB_DATABASE_FILE ??
      resolve(root, "../.data/node/site.sqlite"),
  ),
  stamp = new Date().toISOString().replace(/[:.]/g, "-"),
  output = resolve(
    option("output") ?? resolve(root, `../.backups/site-${stamp}.sqlite`),
  );
if (source === output)
  throw new Error("Backup output must differ from the database");
await mkdir(dirname(output), { recursive: true });
const database = new Database(source, { readonly: true, fileMustExist: true });
try {
  assertIntegrity(database);
  if (!hasMigrationState(database))
    throw new Error("Database has no formal migration state");
  await database.backup(output);
} finally {
  database.close();
}
const backup = new Database(output, { readonly: true, fileMustExist: true });
let version: string;
try {
  assertIntegrity(backup);
  version = String(
    (
      backup
        .prepare(
          "select version from system_migration_versions order by version desc limit 1",
        )
        .get() as { version?: string } | undefined
    )?.version ?? "unknown",
  );
} finally {
  backup.close();
}
const bytes = await readFile(output),
  manifest = {
    createdAt: new Date().toISOString(),
    source,
    output,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    migrationVersion: version,
  };
await writeFile(`${output}.json`, `${JSON.stringify(manifest, null, 2)}\n`, {
  flag: "wx",
});
console.log(JSON.stringify({ event: "sqlite_backup_completed", ...manifest }));

function option(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? undefined : process.argv[index + 1];
}
function assertIntegrity(database: Database.Database) {
  const rows = database.pragma("integrity_check") as Array<{
    integrity_check: string;
  }>;
  if (rows.length !== 1 || rows[0]?.integrity_check !== "ok")
    throw new Error(`SQLite integrity check failed: ${JSON.stringify(rows)}`);
}
function hasMigrationState(database: Database.Database) {
  return Boolean(
    database
      .prepare(
        "select 1 from sqlite_master where type='table' and name='system_migration_versions'",
      )
      .get(),
  );
}
