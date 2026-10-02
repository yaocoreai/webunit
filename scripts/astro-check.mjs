import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadPlatformEnvironment } from "./environment.mjs";

const platform = process.env.PLATFORM_ENV ?? "node";
await loadPlatformEnvironment(platform, new URL("../../", import.meta.url));
if (process.env.PLATFORM_RENDERER !== "theme" && process.env.PLATFORM_RENDERER !== "web") {
  throw new Error("PLATFORM_RENDERER must select exactly one renderer: theme or web");
}

const astroCli = fileURLToPath(new URL("../node_modules/astro/bin/astro.mjs", import.meta.url));
const result = spawnSync(process.execPath, [astroCli, "check"], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: process.env,
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
