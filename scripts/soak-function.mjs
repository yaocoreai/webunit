import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const rounds = integer('SOAK_ROUNDS', 10, 1, 10_000);
const stress = resolve(import.meta.dirname, 'stress-function.mjs');
for (let round = 1; round <= rounds; round += 1) {
  const result = spawnSync(process.execPath, [stress], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.info(`[function:soak] round=${round}/${rounds}`);
}
function integer(name, fallback, min, max) { const value = Number(process.env[name] ?? fallback); if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}`); return value; }
