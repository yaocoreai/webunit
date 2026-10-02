import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(appRoot, "dist/workers/server/wrangler.json");
const deploymentPath = process.argv[3]
  ? resolve(process.cwd(), process.argv[3])
  : resolve(appRoot, "dist/workers/deployment.json");
const secretsPath = process.argv[4]
  ? resolve(process.cwd(), process.argv[4])
  : undefined;
JSON.parse(await readFile(deploymentPath, "utf8"));

const secretList = secretsPath
  ? JSON.parse(await readFile(secretsPath, "utf8"))
  : readRemoteSecrets();

if (
  !Array.isArray(secretList) ||
  secretList.some((entry) => !isRecord(entry))
) {
  fail("Unexpected Wrangler secret list response");
}

const existingNames = new Set(
  secretList
    .map((entry) => entry.name)
    .filter((name) => typeof name === "string" && name.length > 0),
);

const config = JSON.parse(await readFile(configPath, "utf8"));
const storageWorker = String(config.main ?? "").includes("storage-entry");
const required = storageWorker
  ? ["STORAGE_UPLOAD_SECRET"]
  : ["STORAGE_READ_URL_SECRET", "STORAGE_UPLOAD_SECRET", "FUNCTION_DATA_PROTECTION_KEY"];
for (const name of required)
  if (!existingNames.has(name))
    fail(`Missing required secret binding: ${name}`);

console.info(
  `[secrets:audit:workers] app=${storageWorker ? "storage" : "web"} status=completed required=${required.length}`,
);

function readRemoteSecrets() {
  const wranglerCli = resolve(appRoot, "node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(
    process.execPath,
    [wranglerCli, "secret", "list", "--config", configPath, "--format", "json"],
    {
      cwd: appRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NO_COLOR: "1",
        WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || ".wrangler/logs",
      },
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0)
    fail(redactUrls(`${result.stdout}\n${result.stderr}`.trim()));

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail("Wrangler secret list did not return JSON");
  }
}

function fail(message) {
  console.error(
    ["[secrets:audit:workers] app=web status=failed", message].join("\n"),
  );
  process.exit(1);
}

function redactUrls(value) {
  return value.replaceAll(/https?:\/\/\S+/g, "[redacted-url]");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
