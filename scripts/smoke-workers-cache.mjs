import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { loadPlatformEnvironment } from './environment.mjs';

const pageBudgets = Object.freeze({
  js: Object.freeze({ raw: 80_000, gzip: 35_000 }),
  css: Object.freeze({ raw: 120_000, gzip: 25_000 }),
});

await loadPlatformEnvironment('cloudflare', new URL('../../', import.meta.url));

const argumentsList = process.argv.slice(2);
if (argumentsList.some((value) => value !== '--edge-only')) {
  throw new Error(`Unknown Workers Cache Smoke option: ${argumentsList.join(' ')}`);
}
const edgeOnly = argumentsList.includes('--edge-only');
const origin = requiredOrigin(process.env.CACHE_SMOKE_ORIGIN ?? process.env.SITE_ORIGIN);
const publicPath = normalizePath(process.env.CACHE_SMOKE_PUBLIC_PATH ?? '/');
const nonce = crypto.randomUUID();
const publicUrl = withSmokeQuery(new URL(publicPath, origin), nonce);
const edge = await verifyEdge(origin, publicUrl, nonce);
let report;

if (edgeOnly) {
  report = {
    event: 'workers_edge_smoke_completed',
    generatedAt: new Date().toISOString(),
    mode: 'edge',
    origin,
    edge,
    publicContent: { status: 'not-run', reason: 'requires a published CMS Site, Theme and Page' },
  };
} else {
  const first = await request(publicUrl);
  assertPublicMiss(first, 'first public request');
  const second = await request(publicUrl);
  assert.equal(second.cacheStatus, 'HIT', `second public request must be HIT, received ${second.cacheStatus}`);
  assert.equal(second.requestId, first.requestId, 'cached response must preserve the original request id and skip Worker invocation');
  assert.notEqual(edge.bypassRequestIds.authorization, first.requestId, 'Authorization request must execute the Worker');
  assert.notEqual(edge.bypassRequestIds.cookie, first.requestId, 'personalized Cookie request must execute the Worker');
  const pageAssets = await measurePageAssets(first.bodyText, origin);
  assertPageAssetsWithinBudget(pageAssets);

  report = {
    event: 'workers_cache_smoke_completed',
    generatedAt: new Date().toISOString(),
    mode: 'full',
    origin,
    publicPath,
    public: { first: first.cacheStatus, second: second.cacheStatus, requestIdPreserved: second.requestId === first.requestId },
    pageAssets,
    edge,
  };
}

await persistSmokeReport(report);
console.info(JSON.stringify(report));

async function verifyEdge(edgeOrigin, bypassUrl, nonceValue) {
  const authorized = await request(bypassUrl, { authorization: 'Bearer cache-smoke' });
  assertBypass(authorized, 'Authorization request');
  assert.ok(authorized.requestId, 'Authorization request must execute the Worker');

  const personalized = await request(bypassUrl, { cookie: 'webunit_admin_session=cache-smoke' });
  assertBypass(personalized, 'personalized Cookie request');
  assert.ok(personalized.requestId, 'personalized Cookie request must execute the Worker');

  const functionUrl = withSmokeQuery(new URL('/_/public/installation/status/read', edgeOrigin), nonceValue);
  const functions = await request(functionUrl, { 'content-type': 'application/json' }, { method: 'POST', body: '{}' });
  assert.ok(functions.status >= 200 && functions.status < 300, `Function request returned ${functions.status}`);
  assertNoStore(functions, 'Function request');
  assert.notEqual(functions.cacheStatus, 'HIT', 'Function request must not hit Workers Caching');

  const previewUrl = withSmokeQuery(new URL('/_preview_', edgeOrigin), nonceValue);
  const preview = await request(previewUrl);
  assertNoStore(preview, 'Preview request');
  assert.notEqual(preview.cacheStatus, 'HIT', 'Preview request must not hit Workers Caching');

  const assetPath = await findHashedAsset();
  const assetUrl = withSmokeQuery(new URL(assetPath, edgeOrigin), nonceValue);
  const assetFirst = await request(assetUrl);
  const assetSecond = await request(assetUrl);
  assert.ok(assetFirst.status >= 200 && assetFirst.status < 400, `Static Asset returned ${assetFirst.status}`);
  if (assetFirst.attempts === 1) {
    assert.equal(assetFirst.cacheStatus, 'MISS', `first Static Asset request must be MISS, received ${assetFirst.cacheStatus}`);
  } else {
    assert.ok(['MISS', 'HIT'].includes(assetFirst.cacheStatus), `retried Static Asset request must be MISS or HIT, received ${assetFirst.cacheStatus}`);
  }
  assert.equal(assetSecond.cacheStatus, 'HIT', `second Static Asset request must be HIT, received ${assetSecond.cacheStatus}`);
  assert.equal(assetFirst.requestId, undefined, 'asset-first response must not carry a Worker request id');
  assert.equal(assetSecond.requestId, undefined, 'cached asset-first response must not carry a Worker request id');

  return {
    bypass: { authorization: authorized.cacheStatus, cookie: personalized.cacheStatus, functions: functions.cacheStatus, preview: preview.cacheStatus },
    bypassRequestIds: { authorization: authorized.requestId, cookie: personalized.requestId },
    asset: { path: assetPath, first: assetFirst.cacheStatus, second: assetSecond.cacheStatus, firstAttempts: assetFirst.attempts, workerInvoked: Boolean(assetFirst.requestId || assetSecond.requestId) },
  };
}

async function request(url, headers = {}, init = {}) {
  let failure;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, headers, redirect: 'manual' });
      const body = new Uint8Array(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') ?? '';
      return {
        status: response.status,
        cacheControl: response.headers.get('cache-control') ?? '',
        cacheStatus: response.headers.get('cf-cache-status') ?? 'MISSING',
        requestId: response.headers.get('x-request-id') ?? undefined,
        bodyText: contentType.toLowerCase().includes('text/html') ? new TextDecoder().decode(body) : '',
        attempts: attempt,
      };
    } catch (error) {
      failure = error;
      if (attempt < 3) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 250));
    }
  }
  throw new Error(`Workers Cache Smoke network request failed after 3 attempts: ${url.origin}${url.pathname}`, { cause: failure });
}

function assertPublicMiss(result, label) {
  assert.ok(result.status >= 200 && result.status < 400, `${label} returned ${result.status}`);
  assert.equal(result.cacheStatus, 'MISS', `${label} must be MISS, received ${result.cacheStatus}`);
  assert.ok(result.requestId, `${label} must carry a Worker request id`);
  assert.ok(!result.cacheControl.toLowerCase().includes('no-store'), `${label} unexpectedly returned no-store`);
}

function assertBypass(result, label) {
  assert.equal(result.cacheStatus, 'BYPASS', `${label} must be BYPASS, received ${result.cacheStatus}`);
  assertNoStore(result, label);
}

function assertNoStore(result, label) {
  assert.ok(result.cacheControl.toLowerCase().includes('no-store'), `${label} must return no-store`);
}

function withSmokeQuery(url, nonceValue) {
  url.searchParams.set('__webunit_cache_smoke', nonceValue);
  return url;
}

function requiredOrigin(value) {
  if (!value?.trim()) throw new Error('CACHE_SMOKE_ORIGIN or SITE_ORIGIN is required');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== value.trim()) throw new Error('Cache Smoke origin must be one HTTPS origin');
  return url.origin;
}

function normalizePath(value) {
  if (!value.startsWith('/') || value.startsWith('//')) throw new Error('CACHE_SMOKE_PUBLIC_PATH must be an absolute path');
  return value;
}

async function findHashedAsset() {
  const directory = resolve(import.meta.dirname, '../dist/workers/client/_astro');
  const files = (await readdir(directory)).filter((file) => /\.[A-Za-z0-9_-]{8}\.js$/.test(file)).sort();
  if (!files.length) throw new Error('Cloudflare build does not contain a hashed JavaScript Static Asset');
  return `/_astro/${files[0]}`;
}

async function measurePageAssets(html, pageOrigin) {
  const paths = new Set();
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = new URL(match[1], pageOrigin);
    if (url.origin === pageOrigin && /^\/_astro\/.*\.(?:css|m?js)$/.test(url.pathname)) paths.add(url.pathname);
  }

  const result = {
    js: { files: 0, raw: 0, gzip: 0 },
    css: { files: 0, raw: 0, gzip: 0 },
  };
  const clientDirectory = resolve(import.meta.dirname, '../dist/workers/client');
  for (const path of [...paths].sort()) {
    const source = await readFile(resolve(clientDirectory, `.${path}`));
    const type = path.endsWith('.css') ? 'css' : 'js';
    result[type].files += 1;
    result[type].raw += source.byteLength;
    result[type].gzip += gzipSync(source).byteLength;
  }
  return result;
}

function assertPageAssetsWithinBudget(assets) {
  for (const type of ['js', 'css']) {
    const actual = assets[type];
    const budget = pageBudgets[type];
    assert.ok(
      actual.raw <= budget.raw && actual.gzip <= budget.gzip,
      `public page ${type.toUpperCase()} exceeds ${budget.raw} raw or ${budget.gzip} gzip bytes: ${actual.raw} raw ${actual.gzip} gzip`,
    );
  }
}

async function persistSmokeReport(value) {
  const directory = resolve(import.meta.dirname, '../.wrangler/reports');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'workers-smoke-report.json'), `${JSON.stringify(value, null, 2)}\n`);
}
