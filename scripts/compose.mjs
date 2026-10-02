import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlatformEnvironment } from "./environment.mjs";

const actions = {
  build: ["build"],
  dev: [],
  start: ["up", "-d"],
  deploy: [],
  down: ["down"],
  logs: ["logs", "-f"],
  ps: ["ps"],
};
const action = process.argv[2];
if (!actions[action])
  throw new Error(`Unknown Web compose action: ${action ?? ""}`);

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
await loadPlatformEnvironment("container", new URL("../../", import.meta.url));
if (process.env.PLATFORM_RENDERER !== "theme" && process.env.PLATFORM_RENDERER !== "web") {
  throw new Error("PLATFORM_RENDERER must select exactly one renderer: theme or web");
}
const workspaceEnvironment = resolve(appRoot, "../../.env.container");
const args = ["compose"];
if (existsSync(workspaceEnvironment))
  args.push("--env-file", workspaceEnvironment);
args.push("-f", "deploy/container/docker-compose.yml", ...actions[action]);
if (action === "deploy") {
  run("pnpm", ["release:prepare:container"]);
  const status = runDocker([...args, "up", "-d", "web", "worker"]);
  if (status !== 0) process.exit(status);
  run("pnpm", ["release:activate:container"]);
} else if (action === "dev") {
  process.env.NODE_ENV = "development";
  for (const command of [
    ["build", "web", "worker"],
    ["up", "-d", "web-redis-cache", "web-redis-state"],
  ]) {
    const status = runDocker([...args, ...command]);
    if (status !== 0) process.exit(status);
  }
  for (const command of [
    "db:migrate:container",
    "db:seed:container",
  ]) run("pnpm", [command]);
  process.exitCode = runDocker([...args, "up", "web", "worker"]);
} else process.exitCode = runDocker(args);

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: appRoot, env: process.env, stdio: "inherit" });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

function runDocker(command) {
  const result = spawnSync("docker", command, { cwd: appRoot, env: process.env, stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}
