import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const configPath = resolve(root, process.argv[2] || "dist/workers/server/wrangler.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const wrangler = resolve(root, "node_modules/wrangler/bin/wrangler.js");
const deployments = JSON.parse(run(["deployments", "list", "--config", configPath, "--json"]));
assert.ok(Array.isArray(deployments) && deployments.length > 0, "Worker has no deployment");
const cors = run(["r2", "bucket", "cors", "list", config.r2_buckets[0].bucket_name, "--config", configPath]);
for (const method of ["GET", "PUT"]) assert.ok(cors.toUpperCase().includes(method), `R2 CORS is missing ${method}`);
const baseline = await readFile(resolve(root, "database/migrations/0000_initial.sql"), "utf8");
const baselineVersion = (await readFile(resolve(root, "database/migrations/BASELINE_VERSION"), "utf8")).trim();
const versionDirectory = resolve(root, "database/migrations/versions");
const versionNames = await readdir(versionDirectory).catch((error) => {
  if (error?.code === "ENOENT") return [];
  throw error;
});
const postBaseline = await Promise.all(versionNames.filter((name) => /^\d{4}_.+\.sql$/.test(name) && name.slice(0, 4) > baselineVersion).sort().map((name) => readFile(resolve(versionDirectory, name), "utf8")));
const expectedDatabase = new Database(":memory:");
let expectedTables;
try {
  expectedDatabase.exec([baseline, ...postBaseline].join("\n"));
  expectedTables = expectedDatabase
    .prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name")
    .pluck()
    .all();
} finally {
  expectedDatabase.close();
}
const schema = JSON.parse(run(["d1", "execute", "DB", "--remote", "--config", configPath, "--command", "select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '_cf_%' order by name", "--json"]));
const actualTables = schema.flatMap((result) => result.results ?? []).map((row) => row.name).sort();
assert.deepEqual(actualTables, expectedTables, "Remote D1 schema differs from the current baseline plus version migrations");
console.info("[release:audit:workers] status=completed resources=d1,r2,deployment");

function run(args) {
  const result = spawnSync(process.execPath, [wrangler, ...args], { cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || ".wrangler/logs" } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`.trim());
  return result.stdout;
}
