import assert from 'node:assert/strict';
import test from 'node:test';
import theme from '@/manifest';
import { resolveSeo } from '@/platform/theme/render/seo';
import { renderSeoTemplateValue } from '@/platform/manifest';
import { moduleSeoTemplates } from '@/platform/manifest/site-seo';
import { defineSeoData } from '@/platform/theme/define/datas';
import { resolveDatasSeo } from '@/platform/theme/datas/seo/resolve';
import type { DatasSeoContext } from '@/platform/theme/datas/seo/model';
import type { SeoPayload } from '@/platform/theme/render/model';

const base = {
  title: 'Northstar',
  canonical: 'https://northstar.local/features',
  robots: [{ name: 'robots', content: 'index, follow' }],
  alternates: [{ hreflang: 'en', href: 'https://northstar.local/en/features' }],
  icons: [], meta: [], links: [],
} satisfies Omit<SeoPayload, 'jsonLd'>;

test('installed SEO covers each page module once and leaves model modules to the site template', () => {
  const pageModules = theme.modules.filter((item) => item.kind !== 'model').map((item) => item.key).sort();
  const seoModules = theme.seo.flatMap((item) => item.owner.type === 'module' ? [item.owner.key] : []).sort();
  assert.deepEqual(seoModules, pageModules);
  assert.deepEqual(moduleSeoTemplates.map((item) => item.key).sort(), pageModules);
  assert.equal(theme.seo.filter((item) => item.owner.type === 'site').length, 1);
  assert.equal(theme.seo.every((item) => (item.locale ?? '*') === '*'), true);
});

test('Theme Datas uses the site title on the home page and the entry title on other pages', () => {
  const fields = { title: 'Northstar', seo_title: 'Northstar', description: 'Site description', seo_description: 'Site description' };
  const page = { routePrefix: '', routeKey: '/', fullPath: '/', templateKey: 'page', canonical: 'https://northstar.local/' };
  const context = (entryId: string, moduleKey: string, title: string, path: string): DatasSeoContext => ({
    baseUrl: 'https://northstar.local',
    origin: 'https://northstar.local',
    path,
    requestUrl: `https://northstar.local${path === '/' ? '' : path}`,
    locale: 'en',
    defaultLocale: 'en',
    domainLocale: 'en',
    supportedLocales: ['en', 'zh-cn'],
    moduleKey,
    site: { fields },
    entry: { id: entryId, fields: { title, description: `${title} description` }, page: { ...page, fullPath: path, canonical: `https://northstar.local${path === '/' ? '' : path}` } },
  });
  const home = resolveDatasSeo(context('home', 'page', 'Home', '/'));
  const about = resolveDatasSeo(context('about', 'page', 'About', '/about'));
  const article = resolveDatasSeo(context('materials-guide', 'article', 'Materials Guide', '/article/materials-guide'));
  const advertisement = resolveDatasSeo(context('launch', 'advertisement', 'Launch', '/advertisement/launch'));
  assert.equal(home.title, 'Northstar');
  assert.equal(about.title, 'About | Northstar');
  assert.equal(article.title, 'Materials Guide | Northstar');
  assert.equal(article.jsonLd[0]?.['@type'], 'Article');
  assert.equal(advertisement.robots[0]?.content, 'noindex, nofollow');
});

test('Datas SEO resolves a page template before the module and site templates', () => {
  const templates = defineSeoData({
    templates: [
      { id: 'site-default', owner: { type: 'site' }, content: { title: 'Site' } },
      { id: 'module-page', owner: { type: 'module', key: 'page' }, content: { title: 'Module' } },
      { id: 'module-page-en', locale: 'en', owner: { type: 'module', key: 'page' }, content: { title: 'Module en' } },
      { id: 'page-home', owner: { type: 'page', id: 'home' }, content: { title: 'Home' } },
    ],
  });
  const context = (entryId: string, moduleKey: string, locale: string): DatasSeoContext => ({
    baseUrl: 'https://northstar.local',
    origin: 'https://northstar.local',
    path: '/',
    requestUrl: 'https://northstar.local/',
    locale,
    defaultLocale: 'en',
    domainLocale: 'en',
    supportedLocales: ['en', 'zh-cn'],
    moduleKey,
    site: { fields: {} },
    entry: {
      id: entryId,
      fields: {},
      page: { routePrefix: '', routeKey: '/', fullPath: '/', templateKey: 'page', canonical: 'https://northstar.local/' },
    },
  });
  assert.equal(resolveDatasSeo(context('home', 'page', 'zh-cn'), templates).title, 'Home');
  assert.equal(resolveDatasSeo(context('materials-guide', 'page', 'en'), templates).title, 'Module en');
  assert.equal(resolveDatasSeo(context('materials-guide', 'page', 'zh-cn'), templates).title, 'Module');
  assert.equal(resolveDatasSeo(context('industrial-tape', 'product', 'en'), templates).title, 'Site');
});

test('Datas SEO normalizes an omitted locale to the All locales contract', () => {
  const templates = defineSeoData({
    templates: [{ id: 'default', owner: { type: 'site' }, content: { title: 'Default' } }],
  });
  assert.equal(templates[0]?.locale, '*');
});

test('SEO keeps complete public fields and safely serializes generic Schema.org JSON-LD', () => {
  const seo = resolveSeo({
    ...base,
    openGraph: { type: 'product', image: 'https://northstar.local/share.png', 'image:width': '1200' },
    twitter: { card: 'summary_large_image', image: 'https://northstar.local/share.png' },
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'Product', name: 'Features', url: 'https://northstar.local/features', image: 'javascript:alert(1)', description: '<script>' }],
  });
  assert.equal(seo.canonical, 'https://northstar.local/features');
  assert.deepEqual(seo.alternates, [{ hreflang: 'en', href: 'https://northstar.local/en/features' }]);
  assert.equal(seo.openGraph?.type, 'product');
  assert.equal(seo.jsonLdText.length, 1);
  assert.doesNotMatch(seo.jsonLdText[0]!, /javascript/);
  assert.match(seo.jsonLdText[0]!, /\\u003cscript>/);
});

test('SEO rejects unsafe URL schemes without restricting future Schema.org types', () => {
  const seo = resolveSeo({
    ...base,
    canonical: 'javascript:alert(1)',
    openGraph: { image: 'javascript:alert(1)' },
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'FutureSchemaType', name: 'Allowed' }],
  });
  assert.equal(seo.canonical, undefined);
  assert.equal(seo.openGraph, undefined);
  assert.equal(seo.jsonLdText.length, 1);
  assert.match(seo.jsonLdText[0]!, /FutureSchemaType/);
});

test('SEO head data keeps one authoritative typed or generic tag', () => {
  const seo = resolveSeo({
    ...base,
    robots: [{ name: 'robots', content: 'index, follow' }, { name: 'ROBOTS', content: 'noindex' }],
    meta: [
      { name: 'description', content: 'duplicate' },
      { name: 'keywords', content: 'cms' },
      { name: 'KEYWORDS', content: 'duplicate' },
      { name: 'og:title', content: 'duplicate' },
    ],
    links: [
      { rel: 'canonical', href: 'https://northstar.local/other' },
      { rel: 'manifest', href: 'https://northstar.local/site.webmanifest' },
      { rel: 'MANIFEST', href: 'https://northstar.local/site.webmanifest' },
    ],
    jsonLd: [],
  });
  assert.deepEqual(seo.robots, [{ name: 'robots', content: 'index, follow' }]);
  assert.deepEqual(seo.meta, [{ name: 'keywords', content: 'cms' }]);
  assert.deepEqual(seo.links, [{ rel: 'manifest', href: 'https://northstar.local/site.webmanifest' }]);
});

test('SEO JSON template pipes resolve typed values, fallbacks, assets and stable schema ids', () => {
  const rendered = renderSeoTemplateValue({
    title: '{{ entry.fields.title | default: site.fields.seo_title | append_site_title: site.fields.title }}',
    keywords: '{{ entry.fields.keywords | keywords }}',
    image: '{{ entry.fields.image | image_url }}',
    width: '{{ entry.fields.image | image_width }}',
    id: "{{ route.canonical | fragment: 'article' }}",
    optional: '{{ entry.fields.missing }}',
  }, {
    site: { fields: { title: 'Northstar', seo_title: 'Fallback' } },
    entry: { fields: { title: 'Story', keywords: 'design, design，craft', image: { delivery: { url: '/story.png' }, width: 1200 } } },
    route: { canonical: 'https://northstar.local/story' },
  }, 'https://northstar.local');
  assert.deepEqual(rendered, {
    title: 'Story | Northstar', keywords: 'design, craft', image: 'https://northstar.local/story.png', width: 1200,
    id: 'https://northstar.local/story#article',
  });
});

test('SEO price filters read amountMinor/currency after Site materialization', () => {
  const rendered = renderSeoTemplateValue({
    amount: '{{ entry.fields.price | price_amount }}',
    currency: '{{ entry.fields.price | price_currency }}',
    projected: '{{ entry.fields.offer | price_amount }}',
  }, {
    entry: {
      fields: {
        price: { amountMinor: 1299, currency: 'usd' },
        offer: { amountMinor: 500, currency: 'usd', amount: '5.00' },
      },
    },
  }, 'https://northstar.local');
  assert.deepEqual(rendered, {
    amount: '12.99',
    currency: 'usd',
    projected: '5.00',
  });
});

test('SEO JSON template language rejects unknown filters and missing required values', () => {
  assert.throws(() => renderSeoTemplateValue('{{ entry.title | execute }}', {}, 'https://northstar.local'), /Unknown SEO template filter/);
  assert.throws(() => renderSeoTemplateValue("{{ entry.title | required: 'title' }}", {}, 'https://northstar.local'), /Required SEO template value/);
});

test('SEO JSON template media_* filters resolve Video/Audio Asset fields generically', () => {
  const asset = {
    poster: { url: '/poster.jpg' },
    duration: 245,
    publishedAt: '2026-01-01',
    delivery: { type: 'embed', url: 'https://www.youtube-nocookie.com/embed/abc' },
  };
  const rendered = renderSeoTemplateValue({
    thumbnailUrl: '{{ entry.fields.media | media_thumbnail_url }}',
    duration: '{{ entry.fields.media | media_duration }}',
    uploadDate: '{{ entry.fields.media | media_upload_date }}',
    embedUrl: '{{ entry.fields.media | media_embed_url }}',
  }, { entry: { fields: { media: asset } } }, 'https://northstar.local');
  assert.deepEqual(rendered, {
    thumbnailUrl: 'https://northstar.local/poster.jpg',
    duration: 245,
    uploadDate: '2026-01-01',
    embedUrl: 'https://www.youtube-nocookie.com/embed/abc',
  });
});
