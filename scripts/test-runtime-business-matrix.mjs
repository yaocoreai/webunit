import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

if (process.env.RUNTIME_BUSINESS_WRITE_TESTS !== "true")
  throw new Error(
    "RUNTIME_BUSINESS_WRITE_TESTS=true is required for the write matrix",
  );

const smoke = resolve(import.meta.dirname, "smoke-runtime-business.mjs");
for (const [topology, variable] of [
  ["node", "NODE_BASE_URL"],
  ["container", "CONTAINER_BASE_URL"],
  ["workers", "WORKERS_BASE_URL"],
]) {
  const baseUrl = process.env[variable]?.trim();
  if (!baseUrl)
    throw new Error(`${variable} is required; the business matrix never skips a topology`);
  const result = spawnSync(process.execPath, [smoke], {
    stdio: "inherit",
    env: {
      ...process.env,
      SMOKE_BASE_URL: baseUrl,
      SMOKE_TOPOLOGY: topology,
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.info(
  "[runtime:test:business-matrix] status=completed deployments=node,container,workers",
);
