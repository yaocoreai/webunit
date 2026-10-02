import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadPlatformEnvironment } from "./environment.mjs";
import { assertReleaseTarget, releasePreparationCommands } from './release/workflow.mjs';

const target = assertReleaseTarget(process.argv[2]);

const root = resolve(import.meta.dirname, "..");
await loadPlatformEnvironment(target, new URL("../../", import.meta.url));
process.env.NODE_ENV = "production";
if (process.env.PLATFORM_RENDERER !== "theme" && process.env.PLATFORM_RENDERER !== "web") {
  throw new Error("PLATFORM_RENDERER must select exactly one renderer: theme or web");
}

// Node 与 Cloudflare 由 prebuild 生成；Container 在镜像内生成，但宿主机上的
// 发布命令仍需读取同一份 Manifest，因此只为 Container 预先生成一次。
if (target === "container") run("pnpm", ["generate:registry"]);
run("pnpm", [target === "container" ? "build:container" : `build:${target}`]);
if (target === "cloudflare")
  run(process.execPath, ["scripts/audit-workers-resources.mjs", "dist/workers/server/wrangler.json"]);

if (target === "container") {
  const compose = composeArgs();
  run("docker", [...compose, "up", "-d", "web-redis-cache", "web-redis-state", "web-clickhouse"]);
  run(process.execPath, ["scripts/backup-container.mjs", ...compose.slice(1)]);
} else if (target === "node") {
  const database = resolve(
    String(process.env.WEB_DATABASE_FILE || resolve(root, "../.data/node/site.sqlite")),
  );
  if (existsSync(database)) run("pnpm", ["db:backup:node"]);
  else console.info(JSON.stringify({ event: "node_backup_skipped", reason: "first-deploy" }));
}

for (const command of releasePreparationCommands(target)) run("pnpm", [command]);

console.info(JSON.stringify({ event: "release_prepare_completed", target }));

function composeArgs() {
  const args = ["compose"];
  const envFile = resolve(root, "../../.env.container");
  if (existsSync(envFile)) args.push("--env-file", envFile);
  return [...args, "-f", "deploy/container/docker-compose.yml"];
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}
