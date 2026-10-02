import { existsSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { loadPlatformEnvironment } from "../environment.mjs";

const root = resolve(import.meta.dirname, "../..");
await loadPlatformEnvironment("node", new URL("../../../", import.meta.url));
const file = resolve(
  process.env.WEB_DATABASE_FILE ??
    resolve(import.meta.dirname, "../../../.data/node/site.sqlite"),
);

if (existsSync(file)) {
  run(process.execPath, ["--import", "tsx", "scripts/backup-sqlite.mts"]);
} else {
  console.info(
    JSON.stringify({ event: "node_rebuild_backup_skipped", reason: "missing-database", file }),
  );
}

for (const candidate of [file, `${file}-wal`, `${file}-shm`]) {
  if (existsSync(candidate)) unlinkSync(candidate);
}

run(process.execPath, ["--import", "tsx", "scripts/db/sqlite.mts", "migrate", "node"]);
run(process.execPath, ["--import", "tsx", "scripts/db/sqlite.mts", "seed", "node"]);
run(process.execPath, ["--import", "tsx", "scripts/db/sqlite.mts", "doctor", "node"]);
console.info(JSON.stringify({ event: "database_rebuilt", target: "node", file }));

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}
