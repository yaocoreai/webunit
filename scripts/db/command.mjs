import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadPlatformEnvironment } from '../environment.mjs';

const action = process.argv[2];
const target = process.argv[3];
if (!['migrate', 'seed', 'status', 'doctor'].includes(action ?? ''))
  throw new Error('Database action must be migrate, seed, status, or doctor');
if (!['node', 'container', 'cloudflare'].includes(target ?? ''))
  throw new Error('Database target must be node, container, or cloudflare');

const root = resolve(import.meta.dirname, '../..');
await loadPlatformEnvironment(target, new URL('../../../', import.meta.url));

if (target === 'node') {
  run(process.execPath, ['--import', 'tsx', 'scripts/db/sqlite.mts', action, target]);
} else if (target === 'container') {
  const args = ['compose'];
  const envFile = resolve(root, '../../.env.container');
  if (existsSync(envFile)) args.push('--env-file', envFile);
  args.push('-f', 'deploy/container/docker-compose.yml', 'run', '--rm', '--no-deps', 'web', 'node', 'dist/server/database-command.mjs', action);
  run('docker', args);
} else {
  const configured = spawnSync(process.execPath, ['scripts/cloudflare-config.mjs'], { cwd: root, env: process.env, encoding: 'utf8' });
  if (configured.error) throw configured.error;
  if (configured.status !== 0) {
    process.stderr.write(configured.stderr);
    process.exit(configured.status ?? 1);
  }
  const config = configured.stdout.trim();
  run(process.execPath, action === 'migrate'
    ? ['scripts/migrate-d1.mjs', config]
    : ['scripts/db/d1.mjs', action, config]);
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, env: process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}
