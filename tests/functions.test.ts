import assert from 'node:assert/strict';
import test from 'node:test';
import { defineLayoutData, defineModuleQueryEntries, defineSiteData, defineSiteDataTranslation, defineStorageData, resolveDataDefinition, useLocale, useRequestGeo } from '@/platform/datas';
import type { DataContext } from '@/platform/theme/runtime/request-context';
import staticSite from '@/theme/datas/site';
import staticLayout from '@/theme/datas/layout';
import staticStorages from '@/theme/datas/storage';
import staticMenus from '@/theme/datas/menus';
import theme from '@/manifest';
import { createDatasContentSource } from '@/platform/theme/datas/source';
import { datasModules } from '@/platform/generated/datas-registry';
import { defineModuleData } from '@/platform/datas';
import type { SiteDataInput } from '@/platform/datas';

const createContext = (request: Request) => ({
  request,
  url: new URL(request.url),
  requestId: 'request-1',
  signal: request.signal,
  locale: 'en-us',
  domainHost: 'example.com',
  signals: { geo: async () => ({ countryCode: 'CN' }), bot: async () => null, signals: async () => ({}) } as DataContext['signals'],
});

test('Datas factories expose request helpers through the Datas facade', async () => {
  const request = new Request('https://example.com/page');
  const base = createContext(request);
  const definition = defineSiteData(async (context) => ({
    id: 'site-id', defaultLocale: 'en-us', supportedLocales: ['en-us'], defaultCurrency: 'usd',
    fields: { country: (await useRequestGeo(context))?.countryCode }, domains: [], redirects: [], files: [],
  }));
  const dependencies: unknown[] = [];
  const value = await resolveDataDefinition(definition, { ...base, owner: 'site', definitionKey: 'default', dependency: (dependency) => dependencies.push(dependency) } satisfies DataContext);
  assert.equal(value.fields.country, 'CN');
  assert.deepEqual(dependencies, [{
    browserTtlSeconds: 0,
    sharedTtlSeconds: 0,
    staleWhileRevalidateSeconds: 0,
    surrogateKeys: ['datas:site:default'],
    noStore: true,
  }]);
});

test('Site Data factory executes in the Datas provider before Translation and materialization', async () => {
  assert.equal(typeof staticSite, 'object');
  const request = new Request('https://www.northstar.cn/zh-cn/about');
  const base = createContext(request);
  const dependencies: unknown[] = [];
  const source = createDatasContentSource(theme, {
    request, url: new URL(request.url), requestId: base.requestId, signal: request.signal, signals: base.signals, locale: 'zh-cn', dependency: (value) => dependencies.push(value),
  }, {
    site: defineSiteData(async (context) => ({ ...(staticSite as SiteDataInput), fields: { ...(staticSite as SiteDataInput).fields, contact_email: `${(await useRequestGeo(context))?.countryCode?.toLowerCase()}@northstar.com` } })),
  });
  const result = await source.site.resolveRoute({ host: 'www.northstar.cn', path: '/zh-cn/about', query: '', signal: request.signal });
  assert.equal(result.type, 'render');
  if (result.type !== 'render') return;
  assert.match(result.payload.site.fields.title, /\p{Script=Han}/u);
  assert.equal(result.payload.site.fields.contact_email, 'cn@northstar.com');
});

test('Datas provider resolves one graph per request host and locale', async () => {
  const request = new Request('https://northstar.local/about');
  const base = createContext(request);
  let resolutions = 0;
  const source = createDatasContentSource(theme, {
    request, url: new URL(request.url), requestId: base.requestId, signal: request.signal, signals: base.signals, locale: 'en-us', dependency: () => {},
  }, {
    site: defineSiteData(async () => { resolutions += 1; return staticSite as SiteDataInput; }),
  });
  await source.site.resolveRoute({ host: 'northstar.local', path: '/about', query: '', signal: request.signal });
  await source.createPublicContent({ domainHost: 'northstar.local', locale: 'en-us', signal: request.signal }).asset('studio-cover');
  assert.equal(resolutions, 1);
});

test('Datas resolves URL locale before executing the final localized graph', async () => {
  const request = new Request('https://www.northstar.cn/zh-cn/about', { headers: { 'accept-language': 'en-us' } });
  const base = createContext(request);
  const locales: string[] = [];
  const source = createDatasContentSource(theme, {
    request, url: new URL(request.url), requestId: base.requestId, signal: request.signal, signals: base.signals, locale: 'en-us', dependency: () => {},
  }, {
    site: defineSiteData((context) => {
      locales.push(useLocale(context));
      return { ...(staticSite as SiteDataInput), fields: { ...(staticSite as SiteDataInput).fields, contact_email: `${useLocale(context)}@northstar.com` } };
    }),
  });
  const result = await source.site.resolveRoute({ host: 'www.northstar.cn', path: '/zh-cn/about', query: '', signal: request.signal });
  assert.equal(result.type, 'render');
  if (result.type !== 'render') return;
  assert.deepEqual(locales, ['en-us', 'zh-cn']);
  assert.equal(result.payload.locale, 'zh-cn');
  assert.equal(result.payload.site.fields.contact_email, 'zh-cn@northstar.com');
});

test('Datas SiteFile projection does not execute unrelated content factories', async () => {
  const request = new Request('https://northstar.local/llms.txt');
  const base = createContext(request);
  const source = createDatasContentSource(theme, {
    request, url: new URL(request.url), requestId: base.requestId, signal: request.signal, signals: base.signals, locale: 'en-us', dependency: () => {},
  }, {
    site: staticSite as SiteDataInput,
    layout: defineLayoutData(() => { throw new Error('unrelated layout executed'); }),
  });
  const response = await source.site.readSiteFile({ host: 'northstar.local', path: '/llms.txt', headers: {}, signal: request.signal });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Northstar/);
});

test('dynamic Datas and Translation output passes runtime Theme validation', async () => {
  const request = new Request('https://northstar.local/about');
  const base = createContext(request);
  const source = createDatasContentSource(theme, {
    request, url: new URL(request.url), requestId: base.requestId, signal: request.signal, signals: base.signals, locale: 'en-us', dependency: () => {},
  }, {
    translations: {
      site: [defineSiteDataTranslation('en-us', async () => ({ fields: { unexpected: 'invalid' } as never }))],
    },
  });
  await assert.rejects(
    source.site.resolveRoute({ host: 'northstar.local', path: '/about', query: '', signal: request.signal }),
    /Unknown Datas field: site\.en-us\.unexpected/,
  );
});

test('dynamic presentation Datas uses the same runtime schema as Preview', async () => {
  const request = new Request('https://northstar.local/about');
  const base = createContext(request);
  const source = createDatasContentSource(theme, {
    request, url: new URL(request.url), requestId: base.requestId, signal: request.signal, signals: base.signals, locale: 'en-us', dependency: () => {},
  }, {
    layout: defineLayoutData(async () => ({ ...staticLayout, settings: { ...staticLayout.settings, unexpected: true } })),
  });
  await assert.rejects(
    source.site.resolveRoute({ host: 'northstar.local', path: '/about', query: '', signal: request.signal }),
    /Invalid Datas presentation settings or messages: layout.en-us/,
  );
});

test('dynamic auxiliary Datas fails closed before materialization', async () => {
  const request = new Request('https://northstar.local/about');
  const base = createContext(request);
  const source = createDatasContentSource(theme, {
    request, url: new URL(request.url), requestId: base.requestId, signal: request.signal, signals: base.signals, locale: 'en-us', dependency: () => {},
  }, {
    storages: defineStorageData(async () => ({ entries: { ...staticStorages.entries, unsafe: { id: 'unsafe', type: 'file', title: 'Unsafe', delivery: { type: 'file', url: 'javascript:alert(1)' } } } })),
  });
  await assert.rejects(
    source.site.resolveRoute({ host: 'northstar.local', path: '/about', query: '', signal: request.signal }),
    /Invalid Datas Storage delivery URL: unsafe/,
  );
});

test('Translation factory executes in the same request-scoped Datas graph', async () => {
  const request = new Request('https://www.northstar.cn/zh-cn/about');
  const base = createContext(request);
  const source = createDatasContentSource(theme, {
    request, url: new URL(request.url), requestId: base.requestId, signal: request.signal, signals: base.signals, locale: 'zh-cn', dependency: () => {},
  }, {
    translations: {
      site: [defineSiteDataTranslation('zh-cn', async (context) => ({ fields: { title: `Localized-${(await useRequestGeo(context))?.countryCode}` } }))],
    },
  });
  const result = await source.site.resolveRoute({ host: 'www.northstar.cn', path: '/zh-cn/about', query: '', signal: request.signal });
  assert.equal(result.type, 'render');
  if (result.type === 'render') assert.equal(result.payload.site.fields.title, 'Localized-CN');
});

test('Module Data factory executes inside the same request-scoped Datas graph', async () => {
  const request = new Request('https://northstar.local/product/industrial-tape');
  const base = createContext(request);
  const product = datasModules.product;
  const source = createDatasContentSource(theme, {
    request, url: new URL(request.url), requestId: base.requestId, signal: request.signal, signals: base.signals, locale: 'en-us', dependency: () => {},
  }, {
    menus: { ...staticMenus, 'main-menu': { ...staticMenus['main-menu'], items: staticMenus['main-menu'].items.filter((item) => item.id !== 'products') } },
    modules: {
      ...datasModules,
      product: defineModuleData(async (context) => ({
        id: product.id,
        routePrefix: product.routePrefix, parentKey: product.parentKey, fields: product.fields,
        entries: { ...product.entries, 'industrial-tape': { ...product.entries['industrial-tape'], fields: { ...product.entries['industrial-tape'].fields, description: `${product.entries['industrial-tape'].fields.description}-${(await useRequestGeo(context))?.countryCode}` } } },
      })),
    },
  });
  const content = source.createPublicContent({ domainHost: 'northstar.local', locale: 'en-us', signal: request.signal });
  const entry = await content.module('product').findOne({ id: 'industrial-tape' });
  assert.match(String(entry?.fields.description), /-CN$/);
});

test('Query Entries push bounded operations down and keep route lookup private', async () => {
  const request = new Request('https://northstar.local/product/industrial-tape');
  const base = createContext(request);
  const product = datasModules.product;
  const value = { ...product.entries['industrial-tape'], fields: { ...product.entries['industrial-tape'].fields, description: 'Remote locale value' } };
  const calls: string[] = [];
  const source = createDatasContentSource(theme, {
    request, url: new URL(request.url), requestId: base.requestId, signal: request.signal, signals: base.signals, locale: 'en-us', dependency: () => {},
  }, {
    menus: { ...staticMenus, 'main-menu': { ...staticMenus['main-menu'], items: staticMenus['main-menu'].items.filter((item) => item.id !== 'products') } },
    modules: {
      ...datasModules,
      product: defineModuleData({
        id: product.id,
        fields: product.fields,
        entries: defineModuleQueryEntries({
          async findOne(input) { calls.push(`findOne:${input.id}`); return input.id === 'industrial-tape' ? { id: 'industrial-tape', value } : null; },
          async findRoute(input) { calls.push(`findRoute:${input.routeKey}`); return input.routeKey === '/industrial-tape' ? { id: 'industrial-tape', value } : null; },
          async findMany() { calls.push('findMany'); return { items: [{ id: 'industrial-tape', value }], total: 1, pageInfo: { hasNextPage: false } }; },
          async count() { return 1; },
          async aggregate() { return { count: 1 }; },
          async listSitemaps() { return [{ key: 'catalog' }]; },
          async findSitemap(input) { return input.key === 'catalog' ? { items: [{ id: 'industrial-tape', routeKey: '/industrial-tape', locales: '*' }] } : null; },
        }),
      }),
    },
    translations: { entries: { product: {} }, menus: [] },
  });
  const content = source.createPublicContent({ domainHost: 'northstar.local', locale: 'en-us', signal: request.signal });
  const queried = await content.module('product').findOne({ id: 'industrial-tape' });
  assert.equal(queried?.fields.description, 'Remote locale value');
  assert.equal(calls.includes('findMany'), false);
  const route = await source.site.resolveRoute({ host: 'northstar.local', path: '/product/industrial-tape', query: '', signal: request.signal });
  assert.equal(route.type, 'render');
  if (route.type === 'render') assert.equal(route.payload.entry.fields.description, 'Remote locale value');
  assert.deepEqual(calls, ['findOne:industrial-tape', 'findRoute:/industrial-tape']);
  const sitemap = await source.site.findSitemap({ host: 'northstar.local', path: '/sitemap-product.xml', signal: request.signal });
  assert.equal(sitemap.type, 'urlset');
});
