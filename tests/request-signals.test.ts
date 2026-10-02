import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequestSignalsResolver } from '@/platform/runtime/request-signals';
import { createHttpFunctionRequestContext } from '@/function/common/route/http-request-context';

test('Workers RequestSignals use first-hop Cloudflare metadata and memoize capabilities', async () => {
  const request = new Request('https://example.com/', { headers: { 'user-agent': 'Mozilla/5.0', 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.2' } }) as Request & { cf?: unknown };
  request.cf = { country: 'de', regionCode: 'BE', city: 'Berlin', colo: 'FRA', httpProtocol: 'HTTP/3', tlsVersion: 'TLSv1.3', verifiedBotCategory: 'Search Engine Crawler', botManagement: { score: 88, verifiedBot: false, staticResource: false, jsDetection: { passed: true } } };
  const resolver = createRequestSignalsResolver(request, 'workers');
  assert.equal(resolver.request(), resolver.request());
  assert.equal(resolver.geo(), resolver.geo());
  assert.equal(resolver.bot(), resolver.bot());
  assert.equal((await resolver.geo())?.countryCode, 'DE');
  assert.equal((await resolver.bot())?.botScore, 88);
  assert.equal((await resolver.bot())?.verifiedBotCategory, 'Search Engine Crawler');
  assert.equal((await resolver.bot())?.jsDetectionPassed, true);
  assert.equal(resolver.transport().edgeColo, 'FRA');
  assert.equal(resolver.request().ipAddress, '203.0.113.7');
});

test('Container ignores forwarding metadata unless its proxy is trusted', async () => {
  const request = new Request('https://example.com/', { headers: { 'x-forwarded-for': '203.0.113.8', 'cf-ipcountry': 'US' } });
  const untrusted = createRequestSignalsResolver(request, 'container');
  assert.equal(untrusted.request().ipAddress, undefined);
  assert.equal(await untrusted.geo(), undefined);
  const trusted = createRequestSignalsResolver(request, 'container', true);
  assert.equal(trusted.request().ipAddress, '203.0.113.8');
  assert.equal((await trusted.geo())?.countryCode, 'US');
});

test('Function request context carries normalized Cloudflare Bot signals without fingerprints', () => {
  const request = new Request('https://example.com/', { headers: { 'user-agent': 'Mozilla/5.0', 'cf-connecting-ip': '203.0.113.9' } }) as Request & { cf?: Record<string, unknown> };
  request.cf = { country: 'US', verifiedBotCategory: 'Search Engine Crawler', botManagement: { score: 12, verifiedBot: true, ja4: 'must-not-propagate' } };
  const context = createHttpFunctionRequestContext(request, { capabilities: {}, configuration: { allowedOrigins: [], trustedClientIpHeaders: ['cf-connecting-ip'] }, secrets: {} });
  assert.deepEqual(context.bot, { source: 'cloudflare', botScore: 12, isVerifiedBot: true, verifiedBotCategory: 'Search Engine Crawler' });
  assert.equal(JSON.stringify(context).includes('must-not-propagate'), false);
});
