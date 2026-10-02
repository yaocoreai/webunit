import type { SitemapDescriptor, SitemapEntryData, SiteDataInput } from '@/platform/theme/define/datas';
import type { ManifestModule } from '@/platform/manifest';
import { ApiError } from '@/platform/runtime/error';
import type { SitemapDocument } from '@/platform/theme/source/contracts';
import type { DatasGraph } from '../graph';
import { cmsRouteSegmentPattern, joinCmsRoutePath } from '@/platform/schema';
import type { DatasPageRoute } from '../model';

const keyPattern = cmsRouteSegmentPattern;

type SitemapFile = Readonly<{
  path: string;
  module: ManifestModule & Readonly<{ routePrefix: string }>;
  descriptor: SitemapDescriptor;
}>;

export async function createDatasSitemapDocument(input: Readonly<{
  host: string;
  path: string;
  site: SiteDataInput;
  requirements: readonly ManifestModule[];
  routes: Iterable<DatasPageRoute>;
  graph?: DatasGraph;
}>) {
  const files = await listFiles(input.requirements, input.graph);
  if (input.path === '/sitemap.xml') return {
    type: 'index',
    entries: files.map((file) => ({ path: file.path, ...(file.descriptor.lastModified ? { lastModified: file.descriptor.lastModified } : {}) })),
  } satisfies SitemapDocument;
  const file = files.find((candidate) => candidate.path === input.path);
  if (!file) throw new ApiError('response', 404, '/sitemap.xml');
  const items = await readItems(file, input.routes, input.graph);
  const domainLocale = input.site.domains.find((domain) => domain.host.toLocaleLowerCase() === input.host.toLocaleLowerCase())?.defaultLocale ?? input.site.defaultLocale;
  return {
    type: 'urlset',
    defaultLocale: input.site.defaultLocale,
    domainLocale,
    supportedLocales: input.site.supportedLocales,
    entries: items.map((item) => ({
      path: joinCmsRoutePath(file.module.routePrefix, item.routeKey),
      locales: item.locales === '*' ? input.site.supportedLocales : normalizeSitemapLocales(item.locales, input.site.supportedLocales),
      ...(item.lastModified ? { lastModified: item.lastModified } : {}),
    })),
  } satisfies SitemapDocument;
}

const normalizeSitemapLocales = (values: readonly string[], supportedLocales: readonly string[]) => {
  const byLocale = new Map(supportedLocales.map((locale) => [locale.toLowerCase(), locale]));
  const locales = values.map((value) => byLocale.get(value.trim().toLowerCase()));
  if (locales.some((locale) => !locale)) throw new TypeError('Sitemap item locale must be supported by the Site');
  const normalized = locales as string[];
  if (new Set(normalized).size !== normalized.length) throw new TypeError('Sitemap item locales must be unique after normalization');
  return normalized;
};

async function listFiles(requirements: readonly ManifestModule[], graph?: DatasGraph): Promise<readonly SitemapFile[]> {
  const files: SitemapFile[] = [];
  for (const module of requirements) {
    if ((module.kind ?? 'page') !== 'page' || !module.sitemap || typeof module.routePrefix !== 'string') continue;
    const query = graph?.queryEntries.get(module.key);
    const descriptors = query
      ? query.listSitemaps ? await query.listSitemaps() : (() => { throw new Error(`Page Query Entries requires listSitemaps: ${module.key}`); })()
      : [{ key: 'default' }];
    if (!Array.isArray(descriptors) || !descriptors.length) continue;
    const keys = new Set<string>();
    for (const descriptor of descriptors) {
      if (!descriptor || !keyPattern.test(descriptor.key) || keys.has(descriptor.key) || (descriptor.lastModified !== undefined && !isTimestamp(descriptor.lastModified))) throw new TypeError(`Invalid sitemap descriptor: ${module.key}`);
      keys.add(descriptor.key);
      files.push({
        module: module as SitemapFile['module'],
        descriptor,
        path: descriptors.length === 1 ? `/sitemap-${module.key}.xml` : `/sitemap-${module.key}-${descriptor.key}.xml`,
      });
    }
  }
  if (new Set(files.map((file) => file.path)).size !== files.length) throw new Error('Duplicate sitemap file path');
  return files;
}

async function readItems(file: SitemapFile, routes: Iterable<DatasPageRoute>, graph?: DatasGraph): Promise<readonly SitemapEntryData[]> {
  const query = graph?.queryEntries.get(file.module.key);
  if (query) {
    if (!query.findSitemap) throw new Error(`Page Query Entries requires findSitemap: ${file.module.key}`);
    const result = await query.findSitemap({ key: file.descriptor.key });
    if (!result || !Array.isArray(result.items)) throw new ApiError('response', 404, file.path);
    validateItems(result.items, file.module.key);
    return result.items;
  }
  const items = [...routes]
    .filter((route) => route.module.key === file.module.key && route.entry.page.includeInSitemap)
    .map((route) => ({ id: route.entry.id, routeKey: route.entry.page.routeKey, locales: '*' as const }));
  validateItems(items, file.module.key);
  return items;
}

function validateItems(items: readonly SitemapEntryData[], moduleKey: string) {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item || !keyPattern.test(item.id) || ids.has(item.id) || !item.routeKey.startsWith('/') || (item.routeKey.length > 1 && item.routeKey.endsWith('/')) || (item.locales !== '*' && (!Array.isArray(item.locales) || !item.locales.length || new Set(item.locales).size !== item.locales.length)) || (item.lastModified !== undefined && !isTimestamp(item.lastModified))) throw new TypeError(`Invalid sitemap item: ${moduleKey}`);
    ids.add(item.id);
  }
}

const isTimestamp = (value: string) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
