import Database from "better-sqlite3";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { migrateSqlite } from "./database-migrations.mts";

const root = resolve(import.meta.dirname, ".."),
  directory = await mkdtemp(resolve(tmpdir(), "webunit-recovery-")),
  source = resolve(directory, "source.sqlite"),
  backup = resolve(directory, "backup.sqlite"),
  restored = resolve(directory, "restored.sqlite");
try {
  const database = new Database(source);
  await migrateSqlite(database, root);
  database
    .prepare(
      "insert into common_translation_records (namespace,key,locale,value_json,revision,created_at,updated_at) values (?,?,?,?,1,?,?)",
    )
    .run(
      "drill.namespace",
      "key",
      "fr",
      JSON.stringify({ title: "Recovered" }),
      new Date().toISOString(),
      new Date().toISOString(),
    );
  await database.backup(backup);
  database.prepare("delete from common_translation_records").run();
  database.close();
  await BunlessCopy(backup, restored);
  const recovery = new Database(restored, {
    readonly: true,
    fileMustExist: true,
  });
  const value = recovery
      .prepare(
        "select value_json from common_translation_records where namespace='drill.namespace'",
      )
      .get() as { value_json?: string } | undefined,
    integrity = (
      recovery.pragma("integrity_check") as Array<{ integrity_check: string }>
    )[0]?.integrity_check,
    version = (
      recovery
        .prepare(
          "select version from system_migration_versions order by version desc limit 1",
        )
        .get() as { version?: string } | undefined
    )?.version;
  recovery.close();
  if (
    integrity !== "ok" ||
    JSON.parse(value?.value_json ?? "null")?.title !== "Recovered"
  )
    throw new Error("Recovery drill did not restore authoritative data");
  console.log(
    JSON.stringify({
      event: "sqlite_recovery_drill_completed",
      migrationVersion: version,
      integrity,
    }),
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
async function BunlessCopy(from: string, to: string) {
  const bytes = await readFile(from);
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(to, bytes, { flag: "wx" }),
  );
}
