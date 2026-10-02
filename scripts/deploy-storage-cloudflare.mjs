import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlatformEnvironment } from "./environment.mjs";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
await loadPlatformEnvironment("cloudflare", new URL("../../", import.meta.url));
const configured = spawnSync(process.execPath, ["scripts/cloudflare-config.mjs", "storage"], { cwd: appRoot, env: process.env, encoding: "utf8" });
if (configured.error) throw configured.error;
if (configured.status !== 0) { process.stderr.write(configured.stderr); process.exit(configured.status ?? 1); }
const wrangler = resolve(appRoot, "node_modules/wrangler/bin/wrangler.js");
const deployed = spawnSync(process.execPath, [wrangler, "deploy", "--config", configured.stdout.trim()], { cwd: appRoot, env: process.env, stdio: "inherit" });
if (deployed.error) throw deployed.error;
if ((deployed.status ?? 1) !== 0) process.exit(deployed.status ?? 1);
const audit = spawnSync(process.execPath, ["scripts/audit-workers-secrets.mjs", configured.stdout.trim()], { cwd: appRoot, env: process.env, stdio: "inherit" });
if (audit.error) throw audit.error;
if ((audit.status ?? 1) !== 0) process.exit(audit.status ?? 1);
