import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dirname, "..");
const temporary = await mkdtemp(join(tmpdir(), "webunit-d1-smoke-"));
try {
  const config = join(temporary, "wrangler.json");
  await writeFile(config, JSON.stringify({
    name: "webunit-d1-smoke",
    compatibility_date: "2026-08-21",
    d1_databases: [{ binding: "DB", database_name: "webunit-d1-smoke", database_id: "00000000-0000-0000-0000-000000000000" }],
  }));
  const wrangler = resolve(root, "node_modules/wrangler/bin/wrangler.js");
  run([wrangler, "d1", "execute", "webunit-d1-smoke", "--local", "--config", config, "--persist-to", temporary, "--file", resolve(root, "database/migrations/0000_initial.sql")]);
  const baselineVersion = (await readFile(resolve(root, "database/migrations/BASELINE_VERSION"), "utf8")).trim();
  const versions = await readdir(resolve(root, "database/migrations/versions"));
  for (const migration of versions.filter((name) => /^\d{4}_.+\.sql$/.test(name) && name.slice(0, 4) > baselineVersion).sort())
    run([wrangler, "d1", "execute", "webunit-d1-smoke", "--local", "--config", config, "--persist-to", temporary, "--file", resolve(root, "database/migrations/versions", migration)]);
  run([wrangler, "d1", "execute", "webunit-d1-smoke", "--local", "--config", config, "--persist-to", temporary, "--command", "select count(*) as tables from sqlite_master where type='table'; select count(*) as installation_resources from cms_installation_resources"]);
  console.info("[db:smoke:d1] status=completed disposable=true");
} finally {
  await rm(temporary, { recursive: true, force: true });
}

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", WRANGLER_LOG_PATH: join(temporary, "logs") } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`.trim());
}
