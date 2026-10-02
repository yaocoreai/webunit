import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadPlatformEnvironment } from './environment.mjs';
import { readSourceProvider } from './source-provider.mjs';
import { resolveRenderer } from '../src/platform/build/renderer.mjs';

const target = process.argv[2];
if (!['node', 'container', 'cloudflare'].includes(target)) {
  throw new Error('Web build target must be node, container, or cloudflare');
}

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
await loadPlatformEnvironment(target, new URL('../../', import.meta.url));
const selectedRenderer = 'theme';
await resolveRenderer(new URL('../', import.meta.url), selectedRenderer);
const astroCli = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
const environment = { ...process.env, PLATFORM_RENDERER: selectedRenderer, PLATFORM_THEME_DATAS: 'true' };
delete environment.WEB_DATA_DIR;
delete environment.WEB_CACHE_REDIS_URL;
delete environment.WEB_CACHE_REDIS_MAX_CONNECTIONS;
delete environment.WEB_CACHE_REDIS_TIMEOUT_MS;
delete environment.WEB_CACHE_REDIS_MAXMEMORY;
delete environment.FUNCTION_CACHE_DIR;
delete environment.FUNCTION_CACHE_REDIS_URL;
delete environment.FUNCTION_CACHE_REDIS_MAXMEMORY;
const env = createEnv(environment);
const sourceProvider = await readSourceProvider(new URL('../src/theme/datas/index.ts', import.meta.url));
if (sourceProvider !== 'datas') {
  throw new Error('Production builds package Theme Datas');
}
const publicAdminOrigin = env('PUBLIC_ADMIN_ORIGIN', undefined, { parse: parseHttpOrigin });
if (sourceProvider === 'function') {
  const adminOrigin = env('CMS_ADMIN_ORIGIN', publicAdminOrigin, { parse: target === 'node' ? parseHttpOrigin : parseHttpsOrigin });
  if (adminOrigin) environment.CMS_ADMIN_ORIGIN = adminOrigin;
  else delete environment.CMS_ADMIN_ORIGIN;
} else {
  delete environment.CMS_ADMIN_ORIGIN;
}

if (target === 'cloudflare') {
  // Cloudflare's build-time binding proxy starts a watcher even for production
  // builds. Polling avoids exhausting macOS per-process watcher descriptors and
  // does not affect the deployed Worker or dev:cloudflare.
  environment.CHOKIDAR_USEPOLLING = 'true';
  environment.CHOKIDAR_INTERVAL = '1000';
  const configured = spawnSync(process.execPath, ['scripts/cloudflare-config.mjs'], {
    cwd: appRoot,
    encoding: 'utf8',
    env: environment,
  });
  if (configured.error) throw configured.error;
  if (configured.status !== 0) {
    process.stderr.write(configured.stderr);
    process.exit(configured.status ?? 1);
  }
  environment.CLOUDFLARE_CONFIG_PATH = configured.stdout.trim();
}

const outputRoot = resolve(appRoot, target === 'cloudflare' ? 'dist/workers' : 'dist');
await rm(outputRoot, { recursive: true, force: true });

const result = spawnSync(
  process.execPath,
  [astroCli, 'build', '--mode', target, '--config', 'astro.config.mjs'],
  { cwd: appRoot, stdio: 'inherit', env: environment },
);

if (result.error) throw result.error;
if ((result.status ?? 1) !== 0) {
  process.exitCode = result.status ?? 1;
} else {
  if (target !== 'cloudflare') {
    const workerEntry = spawnSync(process.execPath, ['scripts/build-node-worker-entry.mjs', target], {
      cwd: appRoot,
      stdio: 'inherit',
      env: environment,
    });
    if (workerEntry.error) throw workerEntry.error;
    if ((workerEntry.status ?? 1) !== 0) process.exit(workerEntry.status ?? 1);
    const databaseEntry = spawnSync(process.execPath, ['scripts/build-node-database-entry.mjs'], {
      cwd: appRoot,
      stdio: 'inherit',
      env: environment,
    });
    if (databaseEntry.error) throw databaseEntry.error;
    if ((databaseEntry.status ?? 1) !== 0) process.exit(databaseEntry.status ?? 1);
  }
  await mkdir(outputRoot, { recursive: true });
  await writeFile(resolve(outputRoot, 'deployment.json'), `${JSON.stringify({
    deployment: target === 'cloudflare' ? 'workers' : target,
    sourceProvider,
    renderer: selectedRenderer,
    editorEnabled: selectedRenderer === 'theme' && sourceProvider === 'function' && Boolean(environment.CMS_ADMIN_ORIGIN),
    storageOwner: sourceProvider === 'datas' ? 'web' : 'function',
  }, null, 2)}\n`);
  if (target === 'cloudflare') {
    const themeClientCheck = spawnSync(process.execPath, ['scripts/check-theme-client-boundaries.mjs', '--dist'], {
      cwd: appRoot,
      stdio: 'inherit',
      env: environment,
    });
    if (themeClientCheck.error) throw themeClientCheck.error;
    if ((themeClientCheck.status ?? 1) !== 0) process.exit(themeClientCheck.status ?? 1);
    const bundleCheck = spawnSync(process.execPath, ['scripts/check-workers-bundle.mjs'], {
      cwd: appRoot,
      stdio: 'inherit',
      env: environment,
    });
    if (bundleCheck.error) throw bundleCheck.error;
    process.exitCode = bundleCheck.status ?? 1;
  } else {
    const bundleCheck = spawnSync(process.execPath, ['scripts/check-runtime-bundle.mjs'], {
      cwd: appRoot,
      stdio: 'inherit',
      env: environment,
    });
    if (bundleCheck.error) throw bundleCheck.error;
    process.exitCode = bundleCheck.status ?? 1;
  }
}

function createEnv(source) {
  return (key, defaultValue, options) => {
    const rawValue = source[key];
    const value = typeof rawValue === 'string' ? rawValue.trim() || defaultValue : rawValue ?? defaultValue;
    if (value === undefined) return undefined;
    try {
      if (options?.parse) return options.parse(value, key);
      if (typeof value !== 'string') throw new Error('must be a string');
      return value;
    } catch (error) {
      throw new Error(`Invalid environment variable ${key}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  };
}

function parseHttpOrigin(value) {
  if (typeof value !== 'string') throw new Error('must be a string');
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('must be an absolute HTTP or HTTPS origin');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) {
    throw new Error('must be an absolute HTTP or HTTPS origin');
  }
  return url.origin;
}

function parseHttpsOrigin(value) {
  const origin = parseHttpOrigin(value);
  if (new URL(origin).protocol !== 'https:') throw new Error('must be an absolute HTTPS origin');
  return origin;
}
