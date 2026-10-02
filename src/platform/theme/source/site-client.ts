import type { SitemapDocument } from '@/platform/theme/source/contracts';
import type {
  ErrorRenderPayload,
  PublicEntryPayload,
  ResolvedConsent,
  ThemeModule,
  RenderPayload,
  SectionInstance,
  SeoPayload,
} from '@/platform/theme/render/model';
import type { RouteMode, SiteFile, ResolveResult } from './site';
import { asRecord, readString } from '@/platform/theme/render/value';
import { adaptCache, adaptRefs, contractError, createTranslator, isPublicJson, materialize, readJsonRecord, readStringMap, requireRecord, requireString, type ResourceMap } from './site-adapter-values';
export { adaptSiteManifest } from './site-adapter-values';

function adaptSections(value: unknown, refs: ResourceMap, path: string, seen: Set<string>, defaultCurrency: string): Record<string, SectionInstance[]> {
  const slots = requireRecord(value, path);
  return Object.fromEntries(Object.entries(slots).map(([slot, items]) => {
    if (!Array.isArray(items)) contractError(`${path}.${slot}`);
    const sectionItems = items as unknown[];
    return [slot, sectionItems.map((item: unknown, index: number) => {
      const section = requireRecord(item, `${path}.${slot}.${index}`);
      const id = requireString(section.id, `${path}.${slot}.${index}.id`);
      if (seen.has(id)) contractError(`${path}.${slot}.${index}.id`);
      seen.add(id);
      const messages = readStringMap(section.messages ?? {}, `${path}.${slot}.${index}.messages`);
      return {
        id,
        key: requireString(section.key, `${path}.${slot}.${index}.key`),
        settings: materialize(requireRecord(section.settings ?? {}, `${path}.${slot}.${index}.settings`), refs, defaultCurrency) as Record<string, unknown>,
        messages,
        t: createTranslator(messages),
      };
    })];
  }));
}

function adaptModule(value: unknown, path: string): ThemeModule {
  const module = requireRecord(value, path);
  return { key: requireString(module.key, `${path}.key`), fields: readJsonRecord(module.fields, `${path}.fields`) };
}

function adaptEntry(value: unknown, path: string): PublicEntryPayload {
  const entry = requireRecord(value, path);
  return {
    id: requireString(entry.id, `${path}.id`),
    fields: readJsonRecord(entry.fields, `${path}.fields`),
  };
}

function adaptDocumentInjections(value: unknown, path: string): RenderPayload['documentInjections'] {
  if (!Array.isArray(value)) contractError(path);
  const ids = new Set<string>();
  return (value as unknown[]).map((item, index) => {
    const record = requireRecord(item, `${path}.${index}`);
    const id = requireString(record.id, `${path}.${index}.id`);
    if (ids.has(id)) contractError(`${path}.${index}.id`);
    ids.add(id);
    const requiredConsent = requireArray(record.requiredConsent, `${path}.${index}.requiredConsent`).map((purpose) => requirePatternString(purpose, `${path}.${index}.requiredConsent`, /^(analytics|marketing|preferences|saleOfData)$/)) as RenderPayload['documentInjections'][number]['requiredConsent'];
    if (new Set(requiredConsent).size !== requiredConsent.length) contractError(`${path}.${index}.requiredConsent`);
    const snippets = requireArray(record.snippets, `${path}.${index}.snippets`).map((snippet, snippetIndex) => {
      const snippetRecord = requireRecord(snippet, `${path}.${index}.snippets.${snippetIndex}`);
      const code = requireString(snippetRecord.code, `${path}.${index}.snippets.${snippetIndex}.code`);
      if (/<\/?(?:html|head|body)(?:\s|>)/i.test(code) || /document\.write\s*\(/i.test(code)) {
        contractError(`${path}.${index}.snippets.${snippetIndex}.code`);
      }
      return {
        placement: requirePatternString(snippetRecord.placement, `${path}.${index}.snippets.${snippetIndex}.placement`, /^(head-start|head-end|body-start|body-end)$/) as RenderPayload['documentInjections'][number]['snippets'][number]['placement'],
        code,
      };
    });
    if (snippets.length < 1 || snippets.length > 16) contractError(`${path}.${index}.snippets`);
    const status = requirePatternString(record.status, `${path}.${index}.status`, /^(active|disabled)$/) as RenderPayload['documentInjections'][number]['status'];
    return { id, snippets, requiredConsent, status, sortOrder: requireInteger(record.sortOrder, `${path}.${index}.sortOrder`) };
  }).sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}

function adaptConsent(value: unknown, path: string): ResolvedConsent | undefined {
  if (value === undefined || value === null) return undefined;
  const consent = requireRecord(value, path);
  if (typeof consent.enabled !== 'boolean') contractError(`${path}.enabled`);
  const enabled = consent.enabled as boolean;
  const display = requireRecord(consent.display, `${path}.display`);
  const normalizedDisplay: ResolvedConsent['display'] = (() => {
    if (display.mode === 'always' || display.mode === 'never') return { mode: display.mode };
    if (display.mode !== 'regions') return contractError(`${path}.display.mode`);
    const countryCodes = requireArray(display.countryCodes, `${path}.display.countryCodes`).map((item) => requirePatternString(item, `${path}.display.countryCodes`, /^[a-z]{2}$/));
    const regionCodes = display.regionCodes === undefined ? undefined : requireArray(display.regionCodes, `${path}.display.regionCodes`).map((item) => requirePatternString(item, `${path}.display.regionCodes`, /^[a-z0-9-]{1,16}$/));
    if (display.unknownRegion !== 'show' && display.unknownRegion !== 'hide') contractError(`${path}.display.unknownRegion`);
    return { mode: 'regions', countryCodes, ...(regionCodes ? { regionCodes } : {}), unknownRegion: display.unknownRegion as 'show' | 'hide' };
  })();
  const messages = readStringMap(consent.messages, `${path}.messages`) as ResolvedConsent['messages'];
  for (const key of ['title', 'description', 'acceptAll', 'rejectOptional', 'managePreferences', 'savePreferences', 'necessary', 'analytics', 'marketing', 'preferences', 'saleOfData']) if (!messages[key as keyof typeof messages]) contractError(`${path}.messages.${key}`);
  const adaptPolicy = (item: unknown, itemPath: string): ResolvedConsent['privacyPolicy'] => {
    const link = requireRecord(item, itemPath);
    const target = requirePatternString(link.target, `${itemPath}.target`, /^_(?:self|blank)$/) as '_self' | '_blank';
    const common = { title: requireString(link.title, `${itemPath}.title`), target, href: requireString(link.href, `${itemPath}.href`) };
    if (link.type === 'path' && link.resource === null) return { type: 'path', ...common, resource: null };
    if (link.type === 'module') return { type: 'module', reference: requireString(link.reference, `${itemPath}.reference`), id: requireString(link.id, `${itemPath}.id`), ...common, resource: requireRecord(link.resource, `${itemPath}.resource`) as never };
    return contractError(`${itemPath}.type`);
  };
  const version = requireInteger(consent.version, `${path}.version`); const maxAgeDays = requireInteger(consent.maxAgeDays, `${path}.maxAgeDays`);
  if (version < 1 || maxAgeDays < 1) contractError(path);
  return { enabled, display: normalizedDisplay, privacyPolicy: adaptPolicy(consent.privacyPolicy, `${path}.privacyPolicy`), ...(consent.cookiePolicy ? { cookiePolicy: adaptPolicy(consent.cookiePolicy, `${path}.cookiePolicy`) } : {}), version, maxAgeDays, messages };
}

export function adaptSeoPayload(value: unknown, path: string): SeoPayload {
  const seo = requireRecord(value, path);
  const robots = requireArray(seo.robots, `${path}.robots`).map((item, index) => {
    const record = requireRecord(item, `${path}.robots.${index}`);
    return {
      name: requirePatternString(record.name, `${path}.robots.${index}.name`, /^[a-z][a-z0-9-]{0,63}$/i),
      content: requireString(record.content, `${path}.robots.${index}.content`),
    };
  });
  const alternates = requireArray(seo.alternates, `${path}.alternates`).map((item, index) => {
    const record = requireRecord(item, `${path}.alternates.${index}`);
    return {
      hreflang: requirePatternString(record.hreflang, `${path}.alternates.${index}.hreflang`, /^(?:[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*|x-default)$/),
      href: requireHttpUrl(record.href, `${path}.alternates.${index}.href`),
    };
  });
  const icons = requireArray(seo.icons, `${path}.icons`).map((item, index) => {
    const record = requireRecord(item, `${path}.icons.${index}`);
    const rel = requireString(record.rel, `${path}.icons.${index}.rel`);
    if (!['icon', 'apple-touch-icon', 'mask-icon'].includes(rel)) contractError(`${path}.icons.${index}.rel`);
    const contentType = optionalString(record.contentType, `${path}.icons.${index}.contentType`);
    const sizes = optionalString(record.sizes, `${path}.icons.${index}.sizes`);
    const color = optionalString(record.color, `${path}.icons.${index}.color`);
    return {
      rel: rel as 'icon' | 'apple-touch-icon' | 'mask-icon',
      href: requireHttpUrl(record.href, `${path}.icons.${index}.href`),
      ...(contentType ? { contentType } : {}),
      ...(sizes ? { sizes } : {}),
      ...(color ? { color } : {}),
    };
  });
  const meta = requireArray(seo.meta, `${path}.meta`).map((item, index) => {
    const record = requireRecord(item, `${path}.meta.${index}`);
    return { name: requireString(record.name, `${path}.meta.${index}.name`), content: requireString(record.content, `${path}.meta.${index}.content`) };
  });
  const links = requireArray(seo.links, `${path}.links`).map((item, index) => {
    const record = requireRecord(item, `${path}.links.${index}`);
    const rel = requireString(record.rel, `${path}.links.${index}.rel`);
    if (rel === 'canonical' || rel === 'alternate') contractError(`${path}.links.${index}.rel`);
    return {
      rel,
      href: requireHttpUrl(record.href, `${path}.links.${index}.href`),
      type: optionalString(record.type, `${path}.links.${index}.type`),
      title: optionalString(record.title, `${path}.links.${index}.title`),
      media: optionalString(record.media, `${path}.links.${index}.media`),
    };
  });
  const jsonLdValues = requireArray(seo.jsonLd, `${path}.jsonLd`);
  if (!isPublicJson(jsonLdValues) || JSON.stringify(jsonLdValues).length > 250_000) contractError(`${path}.jsonLd`);
  const jsonLd = jsonLdValues.map((item, index) => readJsonRecord(item, `${path}.jsonLd.${index}`));
  const openGraph = seo.openGraph === undefined ? undefined : readSeoPropertyMap(seo.openGraph, `${path}.openGraph`, true);
  const twitter = seo.twitter === undefined ? undefined : readSeoPropertyMap(seo.twitter, `${path}.twitter`, false) as Record<string, string>;
  if (robots.length === 0) contractError(`${path}.robots`);
  return {
    title: requireString(seo.title, `${path}.title`),
    description: optionalString(seo.description, `${path}.description`),
    robots,
    canonical: requireHttpUrl(seo.canonical, `${path}.canonical`),
    alternates,
    icons,
    meta,
    links,
    ...(openGraph ? { openGraph } : {}),
    ...(twitter ? { twitter } : {}),
    jsonLd,
  };
}

function readSeoPropertyMap(value: unknown, path: string, allowArrays: boolean): Record<string, string | string[]> {
  const record = requireRecord(value, path);
  if (Object.keys(record).length > 256) contractError(path);
  return Object.fromEntries(Object.entries(record).map(([key, item]) => {
    if (!/^[@A-Za-z][@A-Za-z0-9_.:-]{0,127}$/.test(key)) contractError(`${path}.${key}`);
    if (typeof item === 'string') return [key, item];
    if (allowArrays && Array.isArray(item) && item.length <= 64 && item.every((entry) => typeof entry === 'string')) return [key, item as string[]];
    return contractError(`${path}.${key}`);
  }));
}

function requireArray(value: unknown, path: string): unknown[] {
  return Array.isArray(value) && value.length <= 512 ? value : contractError(path);
}

function requireHttpUrl(value: unknown, path: string) {
  const text = requireString(value, path);
  try {
    const url = new URL(text);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
  } catch { /* handled below */ }
  return contractError(path);
}

function optionalString(value: unknown, path: string): string | undefined {
  return value === undefined || value === null ? undefined : typeof value === 'string' ? value : contractError(path);
}

function requirePatternString(value: unknown, path: string, pattern: RegExp): string {
  const text = requireString(value, path);
  return pattern.test(text) ? text : contractError(path);
}

function requireInteger(value: unknown, path: string): number {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : contractError(path);
}

export function adaptRenderPayload(value: unknown, path: string): RenderPayload {
  const render = requireRecord(value, path);
  const refs = adaptRefs(render.refs, `${path}.refs`);
  const site = requireRecord(render.site, `${path}.site`);
  const domain = requireRecord(render.domain, `${path}.domain`);
  const page = requireRecord(render.page, `${path}.page`);
  const pageContent = requireRecord(page.contentJson, `${path}.page.contentJson`);
  const rawLayout = requireRecord(render.layout, `${path}.layout`);
  const layoutContent = requireRecord(rawLayout.contentJson, `${path}.layout.contentJson`);
  const rawTemplate = requireRecord(render.template, `${path}.template`);
  const templateContent = requireRecord(rawTemplate.contentJson, `${path}.template.contentJson`);
  const templateKey = requireString(rawTemplate.templateKey, `${path}.template.templateKey`);
  const instanceKey = requireString(rawTemplate.instanceKey, `${path}.template.instanceKey`);
  if (requireString(page.instanceKey, `${path}.page.instanceKey`) !== instanceKey || !instanceKey.startsWith(`${templateKey}.`)) contractError(`${path}.template.instanceKey`);
  const seen = new Set<string>();
  const defaultCurrency = requireString(site.defaultCurrency, `${path}.site.defaultCurrency`).toLowerCase();
  if (!/^[a-z]{3}$/.test(defaultCurrency)) contractError(`${path}.site.defaultCurrency`);
  const layoutMessages = readStringMap(layoutContent.messages ?? {}, `${path}.layout.contentJson.messages`);
  const templateMessages = readStringMap(templateContent.messages ?? {}, `${path}.template.contentJson.messages`);
  const templateSlots = adaptSections(templateContent.slots ?? {}, refs, `${path}.template.contentJson.slots`, seen, defaultCurrency);
  const pageSlots = adaptSections(pageContent.slots ?? {}, refs, `${path}.page.contentJson.slots`, seen, defaultCurrency);
  const layoutSlots = adaptSections(layoutContent.slots ?? {}, refs, `${path}.layout.contentJson.slots`, seen, defaultCurrency);
  const slotOwners = [layoutSlots, templateSlots, pageSlots];
  const slotKeys = slotOwners.flatMap((slots) => Object.keys(slots));
  if (new Set(slotKeys).size !== slotKeys.length) contractError(`${path}.slots`);
  const parentModule = render.parentModule === null ? null : adaptModule(render.parentModule, `${path}.parentModule`);
  const parentEntry = render.parentEntry === null ? null : adaptEntry(render.parentEntry, `${path}.parentEntry`);
  if ((parentModule === null) !== (parentEntry === null)) contractError(`${path}.parentEntry`);
  const route = requireRecord(render.route, `${path}.route`);
  const query = requireRecord(route.query, `${path}.route.query`);
  if (!Object.values(query).every((item) => typeof item === 'string' || (Array.isArray(item) && item.every((entry) => typeof entry === 'string')))) contractError(`${path}.route.query`);

  return {
    site: {
      fields: readJsonRecord(site.fields, `${path}.site.fields`),
      defaultCurrency,
    },
    domain: {
      host: requireString(domain.host, `${path}.domain.host`),
    },
    module: adaptModule(render.module, `${path}.module`),
    entry: adaptEntry(render.entry, `${path}.entry`),
    parentModule,
    parentEntry,
    locale: requireString(render.locale, `${path}.locale`),
    route: { path: requireString(route.path, `${path}.route.path`), query: query as RenderPayload['route']['query'] },
    page: { instanceKey, slots: pageSlots },
    seo: adaptSeoPayload(render.seo, `${path}.seo`),
    consent: adaptConsent(render.consent, `${path}.consent`),
    documentInjections: adaptDocumentInjections(render.documentInjections ?? [], `${path}.documentInjections`),
    layout: {
      settings: materialize(requireRecord(layoutContent.settings ?? {}, `${path}.layout.contentJson.settings`), refs, defaultCurrency) as Record<string, unknown>,
      messages: layoutMessages,
      slots: layoutSlots,
      t: createTranslator(layoutMessages),
    },
    template: {
      instanceKey,
      templateKey,
      settings: materialize(requireRecord(templateContent.settings ?? {}, `${path}.template.contentJson.settings`), refs, defaultCurrency) as Record<string, unknown>,
      messages: templateMessages,
      slots: templateSlots,
      t: createTranslator(templateMessages),
    },
  };
}

export function adaptErrorRenderPayload(
  value: unknown,
  path: string,
  context: Readonly<{ status: number; requestId?: string }>,
  fallback?: ErrorRenderPayload,
): ErrorRenderPayload {
  const render = requireRecord(value, path);
  const refs = adaptRefs(render.refs ?? {}, `${path}.refs`);
  const site = asRecord(render.site) ?? (fallback ? { fields: fallback.site.fields } : requireRecord(render.site, `${path}.site`));
  const domain = asRecord(render.domain) ?? (fallback ? fallback.domain : requireRecord(render.domain, `${path}.domain`));
  const route = asRecord(render.route) ?? (fallback ? fallback.route : requireRecord(render.route, `${path}.route`));
  const query = asRecord(route.query) ?? (fallback ? fallback.route.query : requireRecord(route.query, `${path}.route.query`));
  const rawLayout = asRecord(render.layout);
  const layoutContent = asRecord(rawLayout?.contentJson ?? rawLayout) ?? {};
  const rawTemplate = asRecord(render.template);
  const errorContent = asRecord(rawTemplate?.contentJson ?? rawTemplate) ?? {};
  const seen = new Set<string>();
  const defaultCurrency = (readString(site.defaultCurrency) || fallback?.site.defaultCurrency || contractError(`${path}.site.defaultCurrency`)).toLowerCase();
  if (!/^[a-z]{3}$/.test(defaultCurrency)) contractError(`${path}.site.defaultCurrency`);
  const layoutMessages = { ...(fallback?.layout.messages ?? {}), ...readStringMap(layoutContent.messages ?? {}, `${path}.layout.messages`) };
  const errorMessages = { ...(fallback?.template.messages ?? {}), ...readStringMap(errorContent.messages ?? {}, `${path}.template.messages`) };
  const layoutSlots = layoutContent.slots === undefined && fallback ? fallback.layout.slots : adaptSections(layoutContent.slots ?? {}, refs, `${path}.layout.slots`, seen, defaultCurrency);
  const errorSlots = errorContent.slots === undefined && fallback ? fallback.template.slots : adaptSections(errorContent.slots ?? {}, refs, `${path}.template.slots`, seen, defaultCurrency);
  if (Object.keys(layoutSlots).some((key) => Object.hasOwn(errorSlots, key))) contractError(`${path}.slots`);
  const status = context.status;
  if (!Number.isInteger(status) || status < 400 || status > 599) contractError(`${path}.error.status`);
  const instanceKey = readString(rawTemplate?.instanceKey) || fallback?.template.instanceKey || 'error.default';
  const templateKey = readString(rawTemplate?.templateKey) || fallback?.template.templateKey || 'error';
  if (instanceKey !== 'error.default' || templateKey !== 'error') contractError(`${path}.template`);
  return {
    type: 'error',
    site: {
      fields: site.fields === undefined && fallback ? fallback.site.fields : readJsonRecord(site.fields, `${path}.site.fields`),
      defaultCurrency,
    },
    domain: { host: readString(domain.host) || fallback?.domain.host || contractError(`${path}.domain.host`) },
    locale: readString(render.locale) || fallback?.locale || contractError(`${path}.locale`),
    route: { path: readString(route.path) || fallback?.route.path || contractError(`${path}.route.path`), query: query as ErrorRenderPayload['route']['query'] },
    seo: render.seo === undefined && fallback ? fallback.seo : adaptSeoPayload(render.seo, `${path}.seo`),
    documentInjections: [],
    layout: { settings: { ...(fallback?.layout.settings ?? {}), ...materialize(requireRecord(layoutContent.settings ?? {}, `${path}.layout.settings`), refs, defaultCurrency) as Record<string, unknown> }, messages: layoutMessages, slots: layoutSlots, t: createTranslator(layoutMessages) },
    template: {
      instanceKey,
      templateKey,
      settings: { ...(fallback?.template.settings ?? {}), ...materialize(requireRecord(errorContent.settings ?? {}, `${path}.template.settings`), refs, defaultCurrency) as Record<string, unknown> },
      messages: errorMessages,
      slots: errorSlots,
      t: createTranslator(errorMessages),
    },
    error: { status, ...(context.requestId ? { requestId: context.requestId } : {}) },
  };
}

export function adaptResolveResult(value: unknown, path = 'site:renders'): ResolveResult {
  const result = requireRecord(value, path);
  const cache = adaptCache(result.cache, `${path}.cache`);
  if (result.mode !== 'public' && result.mode !== 'theme-preview') contractError(`${path}.mode`);
  const mode = result.mode as RouteMode;
  if (mode === 'theme-preview' && (cache.mode !== 'no-store' || cache.visibility !== 'preview')) contractError(`${path}.cache`);
  if (result.type === 'redirect') {
    const redirect = requireRecord(result.redirect, `${path}.redirect`);
    const statusValue = Number(redirect.status);
    if (statusValue !== 301 && statusValue !== 302) contractError(`${path}.redirect.status`);
    const status = statusValue as 301 | 302;
    return { type: 'redirect', mode, status, location: requireString(redirect.location, `${path}.redirect.location`), cache };
  }
  if (result.type === 'file') {
    const file = requireRecord(result.file, `${path}.file`);
    const resourceType = file.resourceType;
    const common = { path: requireString(file.path, `${path}.file.path`), contentType: requireString(file.contentType, `${path}.file.contentType`) };
    const adapted: SiteFile = resourceType === 'text'
      ? { ...common, resourceType, textContent: requireString(file.textContent, `${path}.file.textContent`), etag: readString(file.etag) || undefined, lastModified: readString(file.lastModified) || undefined }
      : resourceType === 'file'
        ? { ...common, resourceType, fileUrl: requireFileUrl(file.fileUrl, `${path}.file.fileUrl`), etag: readString(file.etag) || undefined, lastModified: readString(file.lastModified) || undefined }
        : contractError(`${path}.file.resourceType`);
    return { type: 'file', mode, file: adapted, cache };
  }
  if (result.type !== 'page') contractError(`${path}.type`);
  return { type: 'render', mode, payload: adaptRenderPayload(result.renderPayload, `${path}.renderPayload`), cache };
}

function requireFileUrl(value: unknown, path: string) {
  const text = requireString(value, path);
  if (text.startsWith('/storage/') && !text.startsWith('//')) return text;
  try {
    const url = new URL(text);
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'data:') return url.toString();
  } catch { /* handled below */ }
  return contractError(path);
}

export function adaptSitemapDocument(value: unknown, path: string): SitemapDocument {
  const record = requireRecord(value, path);
  const type = requireString(record.type, `${path}.type`);
  const entries = requireArray(record.entries, `${path}.entries`);
  if (type === 'index') return {
    type,
    entries: entries.map((entry, index) => {
      const item = requireRecord(entry, `${path}.entries.${index}`);
      const itemPath = requireString(item.path, `${path}.entries.${index}.path`);
      if (!/^\/sitemap-[a-z0-9-]+\.xml$/.test(itemPath)) contractError(`${path}.entries.${index}.path`);
      const lastModified = readString(item.lastModified) || undefined;
      return { path: itemPath, ...(lastModified ? { lastModified } : {}) };
    }),
  };
  if (type !== 'urlset') contractError(`${path}.type`);
  const supportedLocales = requireArray(record.supportedLocales, `${path}.supportedLocales`).map((locale, index) => requireString(locale, `${path}.supportedLocales.${index}`));
  const defaultLocale = requireString(record.defaultLocale, `${path}.defaultLocale`);
  const domainLocale = requireString(record.domainLocale, `${path}.domainLocale`);
  if (!supportedLocales.length || !supportedLocales.includes(defaultLocale) || !supportedLocales.includes(domainLocale)) contractError(`${path}.supportedLocales`);
  return {
    type: 'urlset',
    defaultLocale,
    domainLocale,
    supportedLocales,
    entries: entries.map((entry, index) => {
      const item = requireRecord(entry, `${path}.entries.${index}`);
      const itemPath = requireString(item.path, `${path}.entries.${index}.path`);
      if (!itemPath.startsWith('/') || itemPath.includes('?') || itemPath.includes('#')) contractError(`${path}.entries.${index}.path`);
      const locales = requireArray(item.locales, `${path}.entries.${index}.locales`).map((locale, localeIndex) => requireString(locale, `${path}.entries.${index}.locales.${localeIndex}`));
      if (!locales.length || locales.some((locale) => !supportedLocales.includes(locale))) contractError(`${path}.entries.${index}.locales`);
      const lastModified = readString(item.lastModified) || undefined;
      return { path: itemPath, locales, ...(lastModified ? { lastModified } : {}) };
    }),
  };
}
