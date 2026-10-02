import type {
  MenuDataInput,
  MenuItemDataInput,
  ModuleEntryData,
  ModulePageData,
  SiteDataInput,
} from '@/platform/theme/define/datas';
import {
  cmsRouteSegmentPattern,
  joinCmsRoutePath,
  normalizeCmsRouteKey,
  normalizeCmsRoutePrefix,
  parseCmsReference,
} from '@/platform/schema';
import type { ManifestModule } from '@/platform/manifest';

export type DatasModuleSchema = Pick<ManifestModule, 'key' | 'kind' | 'parentKey' | 'routePrefix' | 'templateKey'>;

type Fields = Readonly<Record<string, unknown>>;

export type DatasEntry = Readonly<{
  id: string;
  parentId?: string;
  fields: Fields;
  page?: DatasPage;
}>;

export type DatasPage = Readonly<{
  routeKey: string;
  instanceKey: string;
  includeInSitemap: boolean;
  contentJson: ModulePageData['contentJson'];
}>;

export type DatasModule = Readonly<{
  id: string;
  key: string;
  kind: 'page' | 'model';
  fields: Fields;
  parentKey?: string;
  routePrefix?: string;
  defaultInstanceKey?: string;
  entries: Readonly<Record<string, DatasEntry>>;
}>;

export type DatasPageRoute = Readonly<{
  path: string;
  module: DatasModule;
  entry: DatasEntry & { page: DatasPage };
}>;

type TemplateRecord = Readonly<{ id: string; templateKey: string }>;
export type ResolvedModuleDataInput = Readonly<{
  id: string;
  fields: Fields;
  entries: Readonly<Record<string, ModuleEntryData & Readonly<{ id: string }>>>;
}>;

const keyPattern = cmsRouteSegmentPattern;

export function normalizeRoutePath(routePrefix: string, routeKey: string) {
  try {
    return joinCmsRoutePath(normalizeCmsRoutePrefix(routePrefix), normalizeCmsRouteKey(routeKey));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid route';
    if (message.includes('routePrefix')) throw new Error(`Invalid Datas routePrefix: ${routePrefix}`);
    throw new Error(`Invalid Datas routeKey: ${routeKey}`);
  }
}

export function normalizeDatasEntry(moduleKey: string, requirement: DatasModuleSchema, entryId: string, entry: ModuleEntryData): DatasEntry {
  if (!keyPattern.test(entryId)) throw new Error(`Invalid Datas Entry id: ${moduleKey}.${entryId}`);
  const kind = requirement.kind ?? 'page';
  if (kind === 'model') {
    if (entry.page) throw new Error(`Model Module Entry cannot define Page data: ${moduleKey}.${entryId}`);
    return { id: entryId, ...('parentId' in entry ? { parentId: entry.parentId } : {}), fields: entry.fields };
  }
  const page = entry.page ?? { contentJson: { slots: {} } };
  return {
    id: entryId,
    ...('parentId' in entry ? { parentId: entry.parentId } : {}),
    fields: entry.fields,
    page: {
      routeKey: page.routeKey ?? `/${entryId}`,
      instanceKey: page.instanceKey ?? `${requirement.templateKey ?? requirement.key}.default`,
      includeInSitemap: page.includeInSitemap ?? true,
      contentJson: page.contentJson,
    },
  };
}

export function createDatasModel(
  sourceModules: Readonly<Record<string, ResolvedModuleDataInput>>,
  templates: Readonly<Record<string, TemplateRecord>>,
  requirements: readonly DatasModuleSchema[],
): Readonly<{ modules: Map<string, DatasModule>; pages: Map<string, DatasPageRoute> }> {
  const modules = new Map<string, DatasModule>();
  const pages = new Map<string, DatasPageRoute>();
  const moduleIds = new Set<string>();

  for (const [moduleKey, source] of Object.entries(sourceModules)) {
    if (!keyPattern.test(moduleKey)) throw new Error(`Invalid Datas Module key: ${moduleKey}`);
    if (!source.id.trim() || moduleIds.has(source.id)) throw new Error(`Invalid or duplicate Datas Module id: ${source.id}`);
    moduleIds.add(source.id);
    const requirement = requirements.find((candidate) => candidate.key === moduleKey);
    if (!requirement) throw new Error(`Unknown Theme Module: ${moduleKey}`);
    const normalizedEntries = Object.entries(source.entries).map(([recordKey, entry]) => {
      if (recordKey !== entry.id) throw new Error(`Datas Entry record key must equal id: ${moduleKey}.${recordKey}`);
      return normalizeDatasEntry(moduleKey, requirement, entry.id, entry);
    });
    if (new Set(normalizedEntries.map((entry) => entry.id)).size !== normalizedEntries.length) throw new Error(`Duplicate Datas Entry id: ${moduleKey}`);
    const entries = Object.fromEntries(normalizedEntries.map((entry) => [entry.id, entry]));
    const kind = requirement.kind ?? 'page';
    const module: DatasModule = {
      id: source.id,
      key: moduleKey,
      kind,
      fields: source.fields,
      entries,
      ...(requirement.parentKey ? { parentKey: requirement.parentKey } : {}),
      ...(kind === 'page'
        ? {
            routePrefix: requirement.routePrefix,
            defaultInstanceKey: `${requirement.templateKey ?? requirement.key}.default`,
          }
        : {}),
    };
    modules.set(moduleKey, module);
  }

  for (const module of modules.values()) {
    if (module.parentKey && !modules.has(module.parentKey)) throw new Error(`Unknown parent Datas Module: ${module.key} -> ${module.parentKey}`);
    if (module.kind === 'page' && !templates[module.defaultInstanceKey!]) throw new Error(`Missing default Datas Template: ${module.key} -> ${module.defaultInstanceKey}`);
    for (const entry of Object.values(module.entries)) {
      if (entry.parentId) {
        if (!module.parentKey) throw new Error(`Datas Entry parent requires a parent module: ${module.key}.${entry.id}`);
        const parentModule = modules.get(module.parentKey);
        if (!parentModule?.entries[entry.parentId]) throw new Error(`Unknown parent Datas Entry: ${module.key}.${entry.id} -> ${entry.parentId}`);
      }
      if (!entry.page) continue;
      if (!templates[entry.page.instanceKey]) throw new Error(`Unknown Datas Template instance: ${module.key}.${entry.id} -> ${entry.page.instanceKey}`);
      const path = normalizeRoutePath(module.routePrefix!, entry.page.routeKey);
      if (pages.has(path)) throw new Error(`Duplicate Datas route: ${path}`);
      pages.set(path, { path, module, entry: entry as DatasEntry & { page: DatasPage } });
    }
  }

  return { modules, pages } as const;
}

export function validateSiteData(site: SiteDataInput) {
  if (!keyPattern.test(site.id)) throw new Error(`Invalid Site id: ${site.id}`);
  if (!/^[a-z]{3}$/.test(site.defaultCurrency)) throw new Error(`Invalid Site defaultCurrency: ${site.defaultCurrency}`);
  const normalizedLocales = site.supportedLocales.map(normalizeStoredLocale);
  if (normalizedLocales.some((locale, index) => locale !== site.supportedLocales[index])) throw new Error('Site supportedLocales must use lowercase BCP 47 tags');
  const supportedLocales = new Set(site.supportedLocales);
  if (supportedLocales.size !== site.supportedLocales.length) throw new Error('Duplicate Site supported locale');
  if (normalizeStoredLocale(site.defaultLocale) !== site.defaultLocale) throw new Error('Site defaultLocale must use a lowercase BCP 47 tag');
  if (!supportedLocales.has(site.defaultLocale)) throw new Error(`Unsupported default Site locale: ${site.defaultLocale}`);
  const domainHosts = new Set(site.domains.map((domain) => domain.host));
  if (domainHosts.size !== site.domains.length) throw new Error('Duplicate Site Domain host');
  for (const domain of site.domains) {
    if (normalizeStoredLocale(domain.defaultLocale) !== domain.defaultLocale) throw new Error(`Domain defaultLocale must use a lowercase BCP 47 tag: ${domain.host}`);
    if (!supportedLocales.has(domain.defaultLocale)) throw new Error(`Unsupported Domain defaultLocale: ${domain.host} -> ${domain.defaultLocale}`);
    if (Boolean(domain.redirectTo) !== Boolean(domain.redirectStatusCode)) throw new Error(`Incomplete Domain redirect: ${domain.host}`);
    if (domain.redirectTo === domain.host) throw new Error(`Domain cannot redirect to itself: ${domain.host}`);
    if (domain.redirectTo && !domainHosts.has(domain.redirectTo)) throw new Error(`Unknown Domain redirect target: ${domain.host} -> ${domain.redirectTo}`);
  }
  const redirects = new Set<string>();
  for (const redirect of site.redirects) {
    if (!redirect.path.startsWith('/') || !redirect.location.startsWith('/') || redirect.path === redirect.location) throw new Error(`Invalid Site redirect: ${redirect.path} -> ${redirect.location}`);
    if (redirects.has(redirect.path)) throw new Error(`Duplicate Site redirect path: ${redirect.path}`);
    redirects.add(redirect.path);
  }
  const files = new Set<string>();
  for (const file of site.files) {
    if (!file.path.startsWith('/') || files.has(file.path) || redirects.has(file.path)) throw new Error(`Invalid Site file path: ${file.path}`);
    if (/^\/sitemap[^/]*\.xml$/.test(file.path) || ['/manifest.webmanifest', '/browserconfig.xml'].includes(file.path)) throw new Error(`Reserved Web document Site file path: ${file.path}`);
    if (file.path === '/robots.txt' && file.type !== 'text') throw new Error('robots.txt Site file must be text');
    if (file.type !== 'text' && !file.content.startsWith('/') && !file.content.startsWith('https://')) throw new Error(`Invalid Site file target: ${file.path} -> ${file.content}`);
    files.add(file.path);
  }
}

const normalizeStoredLocale = (value: string): string | undefined => {
  try { return new Intl.Locale(value.trim()).toString().toLowerCase(); } catch { return undefined; }
};

export function validateMenuData(menus: MenuDataInput, modules: ReadonlyMap<string, DatasModule>) {
  const visit = (menuKey: string, items: readonly MenuItemDataInput[], itemIds: Set<string>, state: { count: number }, depth: number): void => {
    if (depth > 10) throw new Error(`CmsMenu exceeds maximum depth: ${menuKey}`);
    for (const item of items) {
      if (++state.count > 5000) throw new Error(`CmsMenu exceeds maximum item count: ${menuKey}`);
      if (itemIds.has(item.id)) throw new Error(`Duplicate CmsMenu item id: ${menuKey}.${item.id}`);
      itemIds.add(item.id);
      if (item.link.type === 'path' && !item.link.href) throw new Error(`Invalid path CmsMenu link: ${menuKey}.${item.id}`);
      if (item.link.type === 'module') {
        const link = item.link;
        const parsed = parseCmsReference(link.reference);
        const module = parsed?.kind === 'module' ? modules.get(parsed.moduleKey) : undefined;
        const entry = module?.entries[link.id];
        if (!module || module.kind !== 'page' || !entry?.page) throw new Error(`Invalid Module CmsMenu link: ${menuKey}.${item.id}`);
      }
      visit(menuKey, item.children, itemIds, state, depth + 1);
    }
  };
  for (const [key, menu] of Object.entries(menus)) visit(key, menu.items, new Set(), { count: 0 }, 1);
}
