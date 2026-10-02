import type { SiteManifest, SitemapDocument } from './contracts';
import { isNotModified } from '@/platform/http/conditional-request';

const cacheControl = 'public, max-age=300, s-maxage=300';
const maxXmlBytes = 50 * 1024 * 1024;
const maxUrls = 5_000;

export function renderSitemapResponse(request: Request, document: SitemapDocument) {
  const origin = new URL(request.url).origin;
  const xml = document.type === 'index' ? renderIndex(origin, document) : renderUrlset(origin, document);
  if (new TextEncoder().encode(xml).byteLength > maxXmlBytes) throw new Error('Sitemap XML size limit exceeded');
  return textResponse(request, xml, 'application/xml; charset=utf-8', 'sitemap');
}

export function renderRobotsResponse(request: Request) {
  const origin = new URL(request.url).origin;
  return textResponse(request, `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, 'text/plain; charset=utf-8', 'robots');
}

export function renderManifestResponse(request: Request, manifest: SiteManifest) {
  const body = `${JSON.stringify(manifest)}\n`;
  return textResponse(request, body, 'application/manifest+json; charset=utf-8', 'manifest');
}

export function renderBrowserConfigResponse(request: Request, manifest: SiteManifest) {
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const icon = icons.flatMap((candidate) => candidate && typeof candidate === 'object' && !Array.isArray(candidate) && typeof candidate.src === 'string' ? [candidate] : []).find((candidate) => candidate.sizes === '150x150')
    ?? icons.flatMap((candidate) => candidate && typeof candidate === 'object' && !Array.isArray(candidate) && typeof candidate.src === 'string' ? [candidate] : [])[0];
  const tile = icon ? `<square150x150logo src="${escapeXml(String(icon.src))}"/>` : '';
  const color = typeof manifest.theme_color === 'string' ? `<TileColor>${escapeXml(manifest.theme_color)}</TileColor>` : '';
  const body = `<?xml version="1.0" encoding="utf-8"?>\n<browserconfig><msapplication><tile>${tile}${color}</tile></msapplication></browserconfig>\n`;
  return textResponse(request, body, 'application/xml; charset=utf-8', 'browserconfig');
}

const renderIndex = (origin: string, document: Extract<SitemapDocument, { type: 'index' }>) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${document.entries.map((entry) => `<sitemap><loc>${escapeXml(`${origin}${entry.path}`)}</loc>${entry.lastModified ? `<lastmod>${escapeXml(entry.lastModified)}</lastmod>` : ''}</sitemap>`).join('')}</sitemapindex>\n`;

const renderUrlset = (origin: string, document: Extract<SitemapDocument, { type: 'urlset' }>) => {
  const href = (locale: string, path: string) => `${origin}${locale === document.domainLocale ? '' : `/${locale.toLowerCase()}`}${path === '/' ? '' : path}`;
  const urls = document.entries.flatMap((entry) => {
    if (entry.locales.some((locale) => !document.supportedLocales.includes(locale))) throw new TypeError(`Unsupported sitemap locale: ${entry.path}`);
    const alternates = entry.locales.map((locale) => ({ hreflang: locale, href: href(locale, entry.path) }));
    const xDefault = entry.locales.includes(document.defaultLocale) ? [{ hreflang: 'x-default', href: href(document.defaultLocale, entry.path) }] : [];
    return entry.locales.map((locale) => ({ loc: href(locale, entry.path), lastModified: entry.lastModified, alternates: [...alternates, ...xDefault] }));
  }).sort((left, right) => left.loc.localeCompare(right.loc));
  if (urls.length > maxUrls) throw new Error('Sitemap URL limit exceeded');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.map((url) => `<url><loc>${escapeXml(url.loc)}</loc>${url.lastModified ? `<lastmod>${escapeXml(url.lastModified)}</lastmod>` : ''}${url.alternates.map((alternate) => `<xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.href)}"/>`).join('')}</url>`).join('')}</urlset>\n`;
};

const textResponse = (request: Request, body: string, contentType: string, prefix: string) => {
  const etag = contentEtag(prefix, body);
  const headers = new Headers({ 'cache-control': cacheControl, 'content-type': contentType, etag });
  if (isNotModified(request, { etag })) return new Response(null, { status: 304, headers });
  return new Response(request.method === 'HEAD' ? null : body, { headers });
};

const contentEtag = (prefix: string, value: string) => {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `"${prefix}-${value.length}-${(hash >>> 0).toString(16)}"`;
};

const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
