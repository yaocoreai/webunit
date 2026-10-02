import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

const root = resolve(process.cwd(), process.argv[2] || "dist");
const deployment = JSON.parse(await readFile(resolve(root, "deployment.json"), "utf8"));
if (deployment.deployment === "workers") throw new Error("Workers bundles are verified by build:cloudflare");
const server = resolve(root, "server");
const files = (await visit(server)).filter((file) => /\.mjs$/.test(file));
const sources = new Map(await Promise.all(files.map(async (file) => [file, await readFile(file, "utf8")])));
const forbidden = deployment.deployment === "node"
  ? ["bullmq", "createClickHouseAnalyticsEngine", "createRedisQueueRuntime", "createRedisCacheFromUrl", "createRedisRateLimiter", "createRedisCoordination"]
  : ["@duckdb/node-api", "createDuckDBAnalyticsEngine", "createFileCache", "createMemoryRateLimiter", "createMemoryCoordination"];
for (const marker of forbidden) {
  const matched = [...sources].find(([, source]) => source.includes(marker));
  assert.ok(!matched, `${deployment.deployment} bundle contains foreign runtime marker ${marker}: ${matched ? relative(server, matched[0]) : ""}`);
}
const entry = resolve(server, "entry.mjs");
const staticClosure = new Set();
collect(entry);
const coldSource = [...staticClosure].map((file) => sources.get(file) ?? "").join("\n");
for (const marker of ["@duckdb/node-api", "bullmq", "@maxmind/geoip2-node", "@aws-sdk/client-s3", "createClickHouseAnalyticsEngine"]) {
  assert.ok(!coldSource.includes(marker), `Optional capability entered ${deployment.deployment} cold entry: ${marker}`);
}
const workerEntry = resolve(server, 'worker-entry.mjs');
if (sources.has(workerEntry)) {
  const workerClosure = new Set();
  collect(workerEntry, workerClosure);
  const workerSource = [...workerClosure].map((file) => sources.get(file) ?? '').join('\n');
  for (const marker of ['loadAppRouteDefinitions', 'createBackgroundDefinitionManifest', 'applicationAnalyticsDefinitions', 'templateRenders', 'templateSettings', 'defineTable({', 'renderSqlSchema']) {
    assert.ok(!workerSource.includes(marker), `${deployment.deployment} Queue/Schedule closure contains ${marker}`);
  }
}
console.info(`[runtime:bundle] status=completed deployment=${deployment.deployment} modules=${files.length} coldModules=${staticClosure.size}`);

function collect(file, output = staticClosure) {
  if (output.has(file) || !sources.has(file)) return;
  output.add(file);
  for (const match of sources.get(file).matchAll(/^import(?:[\s\S]*?from\s*)?["']([^"']+)["'];?$/gm)) {
    if (match[1].startsWith(".")) collect(resolve(dirname(file), match[1]), output);
  }
}
async function visit(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map((entry) => entry.isDirectory() ? visit(resolve(directory, entry.name)) : [resolve(directory, entry.name)]))).flat();
}
