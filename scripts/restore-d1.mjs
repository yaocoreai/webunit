import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { loadPlatformEnvironment } from "./environment.mjs";

await loadPlatformEnvironment("cloudflare", new URL("../../", import.meta.url));

const root = resolve(import.meta.dirname, ".."),
  backup = option("backup"),
  config = resolve(
    root,
    option("config") || "dist/workers/server/wrangler.json",
  ),
  wrangler = resolve(root, "node_modules/wrangler/bin/wrangler.js");
if (!backup) throw new Error("--backup is required");
if (option("confirm") !== "restore-empty-d1")
  throw new Error("D1 restore requires --confirm restore-empty-d1");
const tables = query(
  "select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '_cf_%'",
);
if (tables.length)
  throw new Error(
    "D1 restore target must be empty; create a replacement D1 database first",
  );
run([
  "d1",
  "execute",
  "DB",
  "--remote",
  "--config",
  config,
  "--file",
  resolve(backup),
]);
console.info(
  JSON.stringify({
    event: "d1_restore_completed",
    backup: resolve(backup),
    config,
  }),
);
function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? undefined : process.argv[index + 1];
}
function query(sql) {
  return JSON.parse(
    run([
      "d1",
      "execute",
      "DB",
      "--remote",
      "--config",
      config,
      "--command",
      sql,
      "--json",
    ]),
  ).flatMap((result) => result.results ?? []);
}
function run(args) {
  const result = spawnSync(process.execPath, [wrangler, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1",
      WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || ".wrangler/logs",
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${result.stdout}\n${result.stderr}`.trim());
  return result.stdout;
}
