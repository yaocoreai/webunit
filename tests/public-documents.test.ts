import assert from 'node:assert/strict';
import test from 'node:test';
import {
  renderBrowserConfigResponse,
  renderManifestResponse,
  renderRobotsResponse,
  renderSitemapResponse,
} from '@/platform/theme/source/public-documents';
const manifest = { name: 'Northstar CMS', short_name: 'Northstar', theme_color: '#ffffff', icons: [{ src: 'https://assets.example.com/icon?a=1&b=2', type: 'image/png', sizes: '150x150' }] };

test('Web renders default robots with the current public origin', async () => {
  assert.equal(await renderRobotsResponse(new Request('https://www.example.com/robots.txt')).text(), 'User-agent: *\nAllow: /\nSitemap: https://www.example.com/sitemap.xml\n');
});

test('Web renders sitemap XML, validators and conditional responses from structured data', async () => {
  const request = new Request('https://www.example.com/sitemap.xml');
  const document = { type: 'index', entries: [{ path: '/sitemap-products.xml', lastModified: '2026-08-02T00:00:00.000Z' }] } as const;
  const response = renderSitemapResponse(request, document);
  assert.match(await response.clone().text(), /https:\/\/www\.example\.com\/sitemap-products\.xml/);
  const etag = response.headers.get('etag');
  assert.ok(etag);
  assert.equal(renderSitemapResponse(new Request(request, { headers: { 'if-none-match': etag! } }), document).status, 304);
  assert.equal(renderSitemapResponse(new Request(request, { headers: { 'if-none-match': `W/${etag}` } }), document).status, 304);
  assert.equal(renderSitemapResponse(new Request(request, { headers: { 'if-none-match': '*' } }), document).status, 304);
});

test('Web limits each rendered sitemap to 5000 final locale URLs', () => {
  const entry = { path: '/', locales: ['en-us'] } as const;
  const base = { type: 'urlset', defaultLocale: 'en-us', domainLocale: 'en-us', supportedLocales: ['en-us'] } as const;
  assert.doesNotThrow(() => renderSitemapResponse(
    new Request('https://www.example.com/sitemap-pages.xml'),
    { ...base, entries: Array.from({ length: 5_000 }, (_, index) => ({ ...entry, path: `/page-${index}` })) },
  ));
  assert.throws(() => renderSitemapResponse(
    new Request('https://www.example.com/sitemap-pages.xml'),
    { ...base, entries: Array.from({ length: 5_001 }, (_, index) => ({ ...entry, path: `/page-${index}` })) },
  ), /Sitemap URL limit exceeded/);
});

test('Web renders manifest and browserconfig from an independent Manifest template result', async () => {
  const body = await renderManifestResponse(new Request('https://www.example.com/manifest.webmanifest'), manifest).json() as { name: string; icons: Array<{ src: string }> };
  assert.equal(body.name, 'Northstar CMS');
  assert.equal(body.icons[0]?.src, 'https://assets.example.com/icon?a=1&b=2');
  const browserConfig = await renderBrowserConfigResponse(new Request('https://www.example.com/browserconfig.xml'), manifest).text();
  assert.match(browserConfig, /icon\?a=1&amp;b=2/);
  assert.match(browserConfig, /<TileColor>#ffffff<\/TileColor>/);
});
