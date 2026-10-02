import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, ".."),
  composeArgs = process.argv.slice(2),
  container = run(["compose", ...composeArgs, "ps", "-q", "web"], true).trim();
if (!container) {
  console.info(
    JSON.stringify({
      event: "container_backup_skipped",
      reason: "first-deploy",
    }),
  );
  process.exit(0);
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-"),
  remote = `/tmp/webunit-predeploy-${stamp}.sqlite`,
  directory = resolve(root, "../.backups"),
  output = resolve(directory, `container-${stamp}.sqlite`);
await mkdir(directory, { recursive: true });
run([
  "exec",
  container,
  "node",
  "-e",
  `const Database=require('better-sqlite3'),db=new Database(process.env.WEB_DATABASE_FILE||'/data/site.sqlite');db.backup('${remote}').then(()=>db.close())`,
]);
run(["cp", `${container}:${remote}`, output]);
run(["exec", container, "rm", "-f", remote]);
const database = new Database(output, { readonly: true, fileMustExist: true });
let version;
try {
  const integrity = database.pragma("integrity_check");
  if (integrity.length !== 1 || integrity[0]?.integrity_check !== "ok")
    throw new Error("Container backup integrity check failed");
  version = database
    .prepare(
      "select version from system_migration_versions order by version desc limit 1",
    )
    .get()?.version;
  if (!version) throw new Error("Container backup has no migration version");
} finally {
  database.close();
}
const bytes = await readFile(output),
  manifest = {
    createdAt: new Date().toISOString(),
    container,
    output,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    migrationVersion: String(version),
  };
await writeFile(`${output}.json`, `${JSON.stringify(manifest, null, 2)}\n`, {
  flag: "wx",
});
console.info(
  JSON.stringify({ event: "container_backup_completed", ...manifest }),
);
function run(args, capture = false) {
  const result = spawnSync("docker", args, {
    cwd: root,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? undefined : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Docker command failed: docker ${args.join(" ")}`);
  return result.stdout ?? "";
}
