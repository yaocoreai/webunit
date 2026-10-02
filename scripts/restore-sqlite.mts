import Database from "better-sqlite3";
import { copyFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { loadPlatformEnvironment } from "./environment.mjs";

await loadPlatformEnvironment("node", new URL("../../", import.meta.url));
const root = resolve(import.meta.dirname, ".."),
  backup = required("backup"),
  target = resolve(
    option("database") ??
      process.env.WEB_DATABASE_FILE ??
      resolve(root, "../.data/node/site.sqlite"),
  );
if (option("confirm") !== "restore")
  throw new Error("Restore requires --confirm restore");
if (resolve(backup) === target)
  throw new Error("Backup and target paths must differ");
verify(resolve(backup));
const temporary = `${target}.restore-${crypto.randomUUID()}`,
  previous = `${target}.pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await copyFile(resolve(backup), temporary);
verify(temporary);
try {
  await rename(target, previous);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
try {
  await rename(temporary, target);
} catch (error) {
  try {
    await rename(previous, target);
  } catch {
    /* Preserve both files for manual recovery. */
  }
  throw error;
}
console.log(
  JSON.stringify({
    event: "sqlite_restore_completed",
    backup: resolve(backup),
    target,
    previous,
  }),
);

function option(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? undefined : process.argv[index + 1];
}
function required(name: string) {
  const value = option(name);
  if (!value) throw new Error(`--${name} is required`);
  return value;
}
function verify(file: string) {
  const database = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const rows = database.pragma("integrity_check") as Array<{
      integrity_check: string;
    }>;
    if (rows.length !== 1 || rows[0]?.integrity_check !== "ok")
      throw new Error(`SQLite integrity check failed for ${file}`);
    if (
      !database
        .prepare(
          "select 1 from sqlite_master where type='table' and name='system_migration_versions'",
        )
        .get()
    )
      throw new Error(`Backup has no migration state: ${file}`);
  } finally {
    database.close();
  }
}
