import type { ManifestModule, ManifestProperty } from '@/platform/manifest';
import { renderSeoTemplateValue } from '@/platform/manifest';
import type { PublicJson } from '@/platform/theme/render/model';
import type { SiteManifest } from '@/platform/theme/source/contracts';
import { materializeResourceIds } from '../registry';
import { mergeLocalizedValue } from '../localize';
import { localizeResources } from '../localize-resources';
import { collectAssetKeys, loadAssetResources } from '../query-assets';
import { createDatasTranslationReader } from '../translation-cache';
import type { DatasGraph } from '../graph';
import { datasTranslationIdentity } from '../translation-identity';

const toOpenGraphLocale = (locale: string) => new Intl.Locale(locale).toString().replaceAll('-', '_');

type Input = Readonly<{
  host: string;
  origin: string;
  locale: string;
  siteProperties: readonly ManifestProperty[];
  requirements: readonly ManifestModule[];
}>;

export async function resolveDatasManifest(input: Input, graph: DatasGraph): Promise<SiteManifest> {
  const template = matchTemplate(graph.manifests.templates, input.host, input.locale);
  if (!template) throw new Error(`Missing Datas Manifest template for ${input.host} (${input.locale})`);
  const context = await createContext(input, graph);
  const rendered = renderSeoTemplateValue(template.manifestJson, context, input.origin);
  if (!isPublicJsonRecord(rendered)) throw new TypeError(`Invalid Datas Manifest template: ${template.id}`);
  return rendered;
}

const matchTemplate = (templates: DatasGraph['manifests']['templates'], host: string, locale: string) => {
  const normalizedHost = host.toLowerCase().replace(/:\d+$/, '');
  return templates.find((item) => item.domain?.toLowerCase() === normalizedHost && item.locale === locale)
    ?? templates.find((item) => item.domain?.toLowerCase() === normalizedHost && (item.locale === '*' || item.locale === undefined))
    ?? templates.find((item) => item.domain === undefined && item.locale === locale)
    ?? templates.find((item) => item.domain === undefined && (item.locale === '*' || item.locale === undefined));
};

const createContext = async (input: Input, graph: DatasGraph) => {
  const readTranslation = createDatasTranslationReader(graph.translations);
  const siteIdentity = datasTranslationIdentity.siteFields(graph.site.id);
  const localizedValues = mergeLocalizedValue(graph.site.fields, readTranslation<{ fields: Readonly<Record<string, unknown>> }>(siteIdentity.namespace, siteIdentity.key, input.locale)?.fields) as Readonly<Record<string, unknown>>;
  const baseResources = localizeResources(input.locale, input.requirements, graph.site.id, graph.site.defaultCurrency, graph.registry, readTranslation, graph.menuProperties);
  const resources = await loadAssetResources(graph.assetQuery, collectAssetKeys([localizedValues], input.siteProperties), baseResources);
  const fields = materializeResourceIds(localizedValues, input.siteProperties, resources, graph.site.defaultCurrency);
  return {
    site: { id: graph.site.id, fields },
    domain: { host: input.host },
    route: { baseUrl: input.origin, path: '/', canonical: input.origin, url: input.origin },
    locale: { code: input.locale, og: toOpenGraphLocale(input.locale) },
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isPublicJsonRecord = (value: unknown): value is Record<string, PublicJson> => isRecord(value) && Object.values(value).every((item) => isPublicJson(item));
const isPublicJson = (value: unknown, depth = 0): value is PublicJson => depth < 24 && (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)) || (Array.isArray(value) && value.every((item) => isPublicJson(item, depth + 1))) || (isRecord(value) && Object.values(value).every((item) => isPublicJson(item, depth + 1))));
