import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadPlatformEnvironment } from "./environment.mjs";
import { assertOriginsAvailable } from "./ports.mjs";
import { createNodeEnvironment } from "./node-environment.mjs";

const profile = process.argv[2];
if (!["local", "cloudflare", "datas"].includes(profile))
  throw new Error(`Unknown development profile: ${profile}`);

const appRoot = fileURLToPath(new URL("..", import.meta.url));
await loadPlatformEnvironment(
  profile === "cloudflare" ? profile : "node",
  new URL("../../", import.meta.url),
);
const astroCli = fileURLToPath(
  new URL("../node_modules/astro/bin/astro.mjs", import.meta.url),
);
if (profile === "cloudflare") process.env.NODE_ENV = "development";
const cloudflareConfig = profile === "cloudflare"
  ? createCloudflareConfig(appRoot)
  : undefined;
const selectedRenderer = "theme";

const baseEnvironment = {
  ...process.env,
  NODE_ENV: "development",
  PLATFORM_RENDERER: selectedRenderer,
  ...(profile === "local" && !process.env.CMS_ADMIN_ORIGIN
    ? { CMS_ADMIN_ORIGIN: "http://localhost:3001" }
    : {}),
  ...(profile === "datas" ? { PLATFORM_THEME_DATAS: "true", SITE_ORIGIN: process.env.THEME_ORIGIN ?? "http://localhost:3003" } : {}),
  ...(profile === "cloudflare"
    ? {
        CLOUDFLARE_REMOTE_BINDINGS: "true",
        CLOUDFLARE_CONFIG_PATH: cloudflareConfig,
      }
    : {}),
};
const environment = profile === "local"
  ? createNodeEnvironment(baseEnvironment)
  : baseEnvironment;
const developmentOrigin = profile === "datas"
  ? environment.THEME_ORIGIN ?? "http://localhost:3003"
  : profile === "local"
    ? environment.SITE_ORIGIN ?? "http://localhost:3000"
    : "http://localhost:3000";
const developmentUrl = new URL(developmentOrigin);
if (developmentUrl.protocol !== "http:")
  throw new Error(`${profile} development origin must use HTTP: ${developmentOrigin}`);
await assertOriginsAvailable([[profile === "datas" ? "Theme" : "Function", developmentOrigin]]);

console.log(
  JSON.stringify(
    {
      event: "development_start",
      mode: environment.NODE_ENV,
      deployment: profile === "cloudflare" ? "workers" : "node",
      bindings:
        profile === "local"
          ? "sqlite+s3"
          : profile === "datas"
            ? "theme-datas"
            : "cloudflare-remote",
    },
    null,
    2,
  ),
);

const children = [
  spawn(process.execPath, [astroCli, "dev", "--mode", profile === "cloudflare" ? "cloudflare" : "node", "--host", "0.0.0.0", "--port", developmentUrl.port || "80"], {
    cwd: appRoot, env: environment, stdio: "inherit",
  }),
  ...(profile === "local" ? [spawn(process.execPath, ["--import", "tsx", "src/platform/runtime/node/worker-entry.ts"], {
    cwd: appRoot, env: environment, stdio: 'inherit',
  })] : []),
];
let closing = false;
for (const child of children) {
  child.once('error', fail);
  child.once('exit', (code, signal) => {
    if (!closing && (signal || code !== 0)) fail(new Error(`Development process exited (${signal ?? code})`));
  });
}
process.once('SIGINT', close);
process.once('SIGTERM', close);

function fail(error) { console.error(error); process.exitCode = 1; close(); }
function close() { if (closing) return; closing = true; for (const child of children) if (child.exitCode === null) child.kill('SIGTERM'); }

function createCloudflareConfig(appRoot) {
  const configured = spawnSync(process.execPath, ["scripts/cloudflare-config.mjs"], {
    cwd: appRoot,
    env: process.env,
    encoding: "utf8",
  });
  if (configured.error) throw configured.error;
  if ((configured.status ?? 1) !== 0)
    throw new Error(configured.stderr.trim() || "Failed to generate the Cloudflare development config");
  return configured.stdout.trim();
}
