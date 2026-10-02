import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlatformEnvironment } from "./environment.mjs";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
await loadPlatformEnvironment("cloudflare", new URL("../../", import.meta.url));
const config = resolve(appRoot, "dist/workers/server/wrangler.json");
if (!existsSync(config))
  throw new Error("Cloudflare build is missing; run build:cloudflare first");
const wrangler = resolve(appRoot, "node_modules/wrangler/bin/wrangler.js");
run(process.execPath, ["scripts/audit-workers-resources.mjs", config]);
const result = spawnSync(process.execPath, [wrangler, "deploy", "--config", config], {
  cwd: appRoot,
  env: process.env,
  stdio: "inherit",
});
if (result.error) throw result.error;
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
run(process.execPath, ["scripts/audit-workers-secrets.mjs", config]);
run(process.execPath, ["scripts/audit-workers-release.mjs", config]);

function run(command, args) {
  const check = spawnSync(command, args, { cwd: appRoot, env: process.env, stdio: "inherit" });
  if (check.error) throw check.error;
  if ((check.status ?? 1) !== 0) process.exit(check.status ?? 1);
}
