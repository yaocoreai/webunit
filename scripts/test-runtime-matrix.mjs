import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const smoke = resolve(import.meta.dirname, 'smoke-runtime-http.mjs');
const targets = [
  ['node', 'NODE_BASE_URL'],
  ['container', 'CONTAINER_BASE_URL'],
  ['workers', 'WORKERS_BASE_URL'],
];
for (const [topology, variable] of targets) {
  const baseUrl = process.env[variable]?.trim();
  if (!baseUrl) throw new Error(`${variable} is required; enterprise runtime tests never silently skip a topology`);
  const result = spawnSync(process.execPath, [smoke], { stdio: 'inherit', env: { ...process.env, SMOKE_BASE_URL: baseUrl, SMOKE_TOPOLOGY: topology } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.info('[runtime:test:matrix] status=completed deployments=node,container,workers');
