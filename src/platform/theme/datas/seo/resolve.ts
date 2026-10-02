import type { PublicJson, SeoPayload } from '@/platform/theme/render/model';
import templates from '@/theme/datas/seo';
import type { DatasSeoContext, DatasSeoTemplate } from './model';
import { projectPriceForSeo } from '@/platform/theme/content/price';
import { renderSeoTemplateValue } from '@/platform/manifest';

function localizedPath(path: string, locale: string, domainLocale: string) {
  if (locale === domainLocale) return path;
  const prefix = `/${locale.toLowerCase()}`;
  return path === '/' ? prefix : `${prefix}${path}`;
}

const toOpenGraphLocale = (locale: string) => new Intl.Locale(locale).toString().replaceAll('-', '_');

export function resolveDatasSeo(input: DatasSeoContext, source: readonly DatasSeoTemplate[] = templates): SeoPayload {
  const activeTemplates = source.filter((item) => item.status === 'active');
  const matchesOwner = (template: DatasSeoTemplate, owner: 'page' | 'module' | 'site') => {
    if (owner === 'page') return template.owner.type === 'page' && template.owner.id === input.entry.id;
    if (owner === 'module') return template.owner.type === 'module' && template.owner.key === input.moduleKey;
    return template.owner.type === 'site';
  };
  const findTemplate = (locale: string, owner: 'page' | 'module' | 'site') => activeTemplates.find((item) => item.locale === locale && matchesOwner(item, owner));
  const template = findTemplate(input.locale, 'page')
    ?? findTemplate('*', 'page')
    ?? findTemplate(input.locale, 'module')
    ?? findTemplate('*', 'module')
    ?? findTemplate(input.locale, 'site')
    ?? findTemplate('*', 'site');
  if (!template) throw new Error(`Missing site SEO template for Datas module: ${input.moduleKey}`);

  const canonical = input.entry.page.canonical;
  const route = { baseUrl: input.baseUrl, path: input.path, canonical, url: input.requestUrl };
  const content = renderSeoTemplateValue(template.content, {
    site: { ...input.site, fields: projectSeoFields(input.site.fields) },
    entry: { ...input.entry, fields: projectSeoFields(input.entry.fields) },
    parentEntry: input.parentEntry ? { ...input.parentEntry, fields: projectSeoFields(input.parentEntry.fields) } : undefined,
    route,
    locale: { code: input.locale, og: toOpenGraphLocale(input.locale) },
  }, input.origin) as Record<string, unknown>;
  if (typeof content.title !== 'string' || !content.title.trim()) throw new Error(`Invalid Datas SEO template: ${template.id}`);

  const pagePath = input.entry.page.fullPath;
  const alternates = input.supportedLocales.map((locale) => ({
    hreflang: locale,
    href: `${input.origin}${localizedPath(pagePath, locale, input.domainLocale) === '/' ? '' : localizedPath(pagePath, locale, input.domainLocale)}`,
  }));
  const defaultPath = localizedPath(pagePath, input.defaultLocale, input.domainLocale);
  const defaultHref = `${input.origin}${defaultPath === '/' ? '' : defaultPath}`;
  const robotDirectives = content.robots && typeof content.robots === 'object' ? content.robots as Record<string, unknown> : { robots: ['index', 'follow'] };
  const robots = Object.entries(robotDirectives).flatMap(([name, value]) => Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? [{ name, content: value.join(', ') }]
    : []);
  const meta = Array.isArray(content.meta) ? content.meta.flatMap((item) => {
    if (!isRecord(item)) return [];
    const name = readString(item.name);
    const value = readString(item.content);
    return name && value ? [{ name, content: value }] : [];
  }) : [];
  const icons = Array.isArray(content.icons) ? content.icons.flatMap((item) => {
    if (!isRecord(item)) return [];
    const rel = readString(item.rel);
    const href = absoluteUrl(readString(item.href), input.origin);
    return href && (rel === 'icon' || rel === 'apple-touch-icon' || rel === 'mask-icon') ? [{
      rel: rel as 'icon' | 'apple-touch-icon' | 'mask-icon', href,
      ...(readString(item.contentType) ? { contentType: readString(item.contentType) } : {}),
      ...(readString(item.sizes) ? { sizes: readString(item.sizes) } : {}),
      ...(readString(item.color) ? { color: readString(item.color) } : {}),
    }] : [];
  }) : [];
  const links = Array.isArray(content.links) ? content.links.flatMap((item) => {
    if (!isRecord(item)) return [];
    const rel = readString(item.rel);
    const href = absoluteUrl(readString(item.href), input.origin);
    return rel && href ? [{
      rel, href,
      ...(readString(item.type) ? { type: readString(item.type) } : {}),
      ...(readString(item.title) ? { title: readString(item.title) } : {}),
      ...(readString(item.media) ? { media: readString(item.media) } : {}),
    }] : [];
  }) : [];
  const openGraphInput = content.openGraph && typeof content.openGraph === 'object' ? content.openGraph as Record<string, unknown> : undefined;
  const openGraphImages = Array.isArray(openGraphInput?.images) ? openGraphInput.images.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
  const images = openGraphImages.length > 0 ? openGraphImages.map((image) => ({
    url: absoluteUrl(readString(image.url), input.origin),
    secureUrl: absoluteUrl(readString(image.secureUrl), input.origin),
    contentType: readString(image.contentType),
    width: readNumber(image.width), height: readNumber(image.height), alt: readString(image.alt),
  })) : [];
  const openGraph = openGraphInput ? compactProperties({
    ...(isSeoPropertyMap(openGraphInput.properties) ? openGraphInput.properties : {}),
    type: readString(openGraphInput.type) ?? 'website',
    title: readString(openGraphInput.title) ?? content.title,
    description: readString(openGraphInput.description) ?? readString(content.description),
    url: canonical,
    site_name: readString(openGraphInput.siteName),
    locale: readString(openGraphInput.locale) ?? toOpenGraphLocale(input.locale),
    'locale:alternate': readStringArray(openGraphInput.alternateLocales) ?? input.supportedLocales.filter((locale) => locale !== input.locale).map(toOpenGraphLocale),
    image: images.map((image) => image.url).filter(isString),
    'image:secure_url': images.map((image) => image.secureUrl).filter(isString),
    'image:type': images.map((image) => image.contentType).filter(isString),
    'image:width': images.map((image) => image.width?.toString()).filter(isString),
    'image:height': images.map((image) => image.height?.toString()).filter(isString),
    'image:alt': images.map((image) => image.alt).filter(isString),
  }) : undefined;
  const twitterInput = content.twitter && typeof content.twitter === 'object' ? content.twitter as Record<string, unknown> : undefined;
  const twitterImage = twitterInput?.image && typeof twitterInput.image === 'object' && !Array.isArray(twitterInput.image) ? twitterInput.image as Record<string, unknown> : undefined;
  const twitter = twitterInput ? compactStrings({
    ...(isStringMap(twitterInput.properties) ? twitterInput.properties : {}),
    card: readString(twitterInput.card) ?? (twitterImage ? 'summary_large_image' : 'summary'),
    site: readString(twitterInput.site),
    creator: readString(twitterInput.creator),
    title: readString(twitterInput.title) ?? content.title,
    description: readString(twitterInput.description) ?? readString(content.description),
    image: absoluteUrl(readString(twitterImage?.url), input.origin),
    'image:alt': readString(twitterImage?.alt) ?? (twitterImage ? content.title : undefined),
  }) : undefined;

  return {
    title: content.title,
    ...(typeof content.description === 'string' && content.description ? { description: content.description } : {}),
    robots: robots.length > 0 ? robots : [{ name: 'robots', content: 'index, follow' }],
    canonical,
    alternates: [...alternates, { hreflang: 'x-default', href: defaultHref }],
    icons,
    meta, links,
    ...(openGraph ? { openGraph } : {}),
    ...(twitter ? { twitter } : {}),
    jsonLd: Array.isArray(content.jsonLd) ? content.jsonLd as Array<Record<string, PublicJson>> : [],
  };
}

const readString = (value: unknown) => typeof value === 'string' && value.length > 0 ? value : undefined;
const readNumber = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;
const readStringArray = (value: unknown) => Array.isArray(value) ? value.filter(isString) : undefined;
const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const absoluteUrl = (value: string | undefined, origin: string) => {
  if (!value) return undefined;
  try { return new URL(value, origin).toString(); } catch { return undefined; }
};
const isStringMap = (value: unknown): value is Record<string, string> => isRecord(value) && Object.values(value).every((item) => typeof item === 'string');
const isSeoPropertyMap = (value: unknown): value is Record<string, string | string[]> => isRecord(value) && Object.values(value).every((item) => typeof item === 'string' || (Array.isArray(item) && item.every((entry) => typeof entry === 'string')));
const compactStrings = (value: Record<string, string | undefined>) => Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0));
const compactProperties = (value: Record<string, string | string[] | undefined>): Record<string, string | string[]> => Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string | string[]] => typeof entry[1] === 'string' ? entry[1].length > 0 : Array.isArray(entry[1]) && entry[1].length > 0));
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const projectSeoFields = (fields: Record<string, unknown>) => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, projectPriceForSeo(value)]));
