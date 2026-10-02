import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(import.meta.dirname, "..");
const auditScript = path.join(appRoot, "scripts/audit-workers-secrets.mjs");

const runtimeSecrets = [
  "STORAGE_READ_URL_SECRET",
  "STORAGE_UPLOAD_SECRET",
  "FUNCTION_DATA_PROTECTION_KEY",
];
const secretEntries = (names: readonly string[]) =>
  names.map((name) => ({ name, type: "secret_text" }));

test("Web Workers secret audit allows database-installed Admin and requires Storage signing", async () => {
  const complete = await runAudit("function", secretEntries(runtimeSecrets));
  const missing = await runAudit("function", []);

  assert.equal(complete.status, 0, complete.stderr);
  assert.match(complete.stdout, /required=3/);
  assert.equal(missing.status, 1);
  assert.match(
    missing.stderr,
    /Missing required secret binding: STORAGE_READ_URL_SECRET/,
  );
});

test("Web Workers secret audit is independent of the ContentSource", async () => {
  const result = await runAudit("datas", secretEntries(runtimeSecrets));

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /status=completed required=3/);
});

const runAudit = async (
  sourceProvider: "function" | "datas",
  secrets: unknown[],
) => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "web-workers-secrets-audit-"),
  );
  const configPath = path.join(directory, "wrangler.json");
  const deploymentPath = path.join(directory, "deployment.json");
  const secretsPath = path.join(directory, "secrets.json");

  try {
    await Promise.all([
      writeFile(configPath, "{}\n"),
      writeFile(deploymentPath, `${JSON.stringify({ sourceProvider })}\n`),
      writeFile(secretsPath, `${JSON.stringify(secrets)}\n`),
    ]);
    return spawnSync(
      process.execPath,
      [auditScript, configPath, deploymentPath, secretsPath],
      {
        cwd: appRoot,
        encoding: "utf8",
      },
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};
