import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const config = resolve(root, 'dist/workers/server/wrangler.json');
const wrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
const reportDirectory = resolve(root, '.wrangler/reports');
const reportPath = resolve(reportDirectory, 'workers-bundle-report.json');
const profilePath = resolve(reportDirectory, 'worker-startup.cpuprofile');
await mkdir(reportDirectory, { recursive: true });

const environment = {
  ...process.env,
  WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || resolve(root, '.wrangler/logs'),
  WRANGLER_REGISTRY_PATH: process.env.WRANGLER_REGISTRY_PATH || resolve(root, '.wrangler/registry'),
  MINIFLARE_REGISTRY_PATH: process.env.MINIFLARE_REGISTRY_PATH || resolve(root, '.wrangler/registry'),
};
const deploy = run(['deploy', '--dry-run', '--config', config]);
const startup = run(['check', 'startup', '--config', config, '--outfile', profilePath]);
const uploadMatch = deploy.match(/Total Upload:\s*([\d.]+)\s*KiB\s*\/\s*gzip:\s*([\d.]+)\s*KiB/i);
const startupBundleMatch = startup.match(/Bundle:\s*([\d.]+)\s*KiB\s*\/\s*gzip:\s*([\d.]+)\s*KiB/i);
const windowMatch = startup.match(/Profile window:\s*([\d.]+)\s*ms/i);
const activeMatch = startup.match(/Active:\s*([\d.]+)\s*ms/i);
assert.ok(uploadMatch, 'Wrangler dry-run did not report upload size');
assert.ok(startupBundleMatch, 'Wrangler startup check did not report bundle size');

const kibibytes = (value) => Math.round(Number(value) * 1024);
const wranglerReport = {
  version: deploy.match(/wrangler\s+([\d.]+)/i)?.[1],
  upload: { raw: kibibytes(uploadMatch[1]), gzip: kibibytes(uploadMatch[2]) },
  startup: {
    bundleRaw: kibibytes(startupBundleMatch[1]),
    bundleGzip: kibibytes(startupBundleMatch[2]),
    profileWindowMs: windowMatch ? Number(windowMatch[1]) : undefined,
    activeMs: activeMatch ? Number(activeMatch[1]) : undefined,
    localProfile: '.wrangler/reports/worker-startup.cpuprofile',
    comparableToCloudflareProduction: false,
  },
};
assert.ok(wranglerReport.upload.raw <= 64 * 1024 * 1024, `Wrangler upload exceeds 64 MiB: ${wranglerReport.upload.raw}`);
assert.ok(wranglerReport.upload.gzip <= 3 * 1024 * 1024, `Wrangler upload exceeds 3 MiB gzip: ${wranglerReport.upload.gzip}`);
const report = JSON.parse(await readFile(reportPath, 'utf8'));
report.upload.wrangler = wranglerReport.upload;
report.startup = wranglerReport.startup;
report.tooling = { wrangler: wranglerReport.version };
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.info(`[workers:analyze] status=completed uploadRaw=${wranglerReport.upload.raw} uploadGzip=${wranglerReport.upload.gzip} startupActiveMs=${wranglerReport.startup.activeMs ?? 'unavailable'} report=.wrangler/reports/workers-bundle-report.json`);

function run(arguments_) {
  const result = spawnSync(process.execPath, [wrangler, ...arguments_], {
    cwd: root,
    env: environment,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const output = stripAnsi(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) throw new Error(`Wrangler ${arguments_.join(' ')} failed:\n${output.slice(-8_000)}`);
  return output;
}

function stripAnsi(value) {
  return value.replaceAll(new RegExp(`${String.fromCodePoint(27)}\\[[0-?]*[ -/]*[@-~]`, 'g'), '');
}
