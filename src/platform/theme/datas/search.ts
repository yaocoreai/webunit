import { extractCmsFilterText, isCmsFlattenFilterType } from '@/platform/schema';
import { validateQuery, type ModelQuery, type ModelWhere } from '@/platform/theme/content/model';
import type { ManifestModule, ManifestProperty } from '@/platform/manifest';
import type { ResolvedModuleDataInput } from './model';
import type { DatasModule } from './model';
import { datasModules } from '@/platform/generated/datas-registry';
import type { SiteDataInput } from '@/platform/theme/define/datas';
import { mergeLocalizedValue } from './localize';
import { getDatasTranslation, type DatasTranslationReader } from './translation-cache';
import { datasTranslationIdentity } from './translation-identity';

export type DatasSearchDocument = Readonly<{
  siteId: string;
  moduleKey: string;
  entryId: string;
  locale: string;
  text: string;
}>;

export function createDatasSearchDocuments(requirements: readonly ManifestModule[], site: SiteDataInput, modules: Readonly<Record<string, ResolvedModuleDataInput>> | ReadonlyMap<string, DatasModule> = datasModules, readTranslation: DatasTranslationReader = getDatasTranslation): readonly DatasSearchDocument[] {
  const documents: DatasSearchDocument[] = [];
  for (const requirement of requirements) {
    const properties = requirement.entryProperties ?? [];
    if (!properties.length) continue;
    const source = (typeof (modules as ReadonlyMap<string, DatasModule>).get === 'function'
      ? (modules as ReadonlyMap<string, DatasModule>).get(requirement.key)
      : (modules as Readonly<Record<string, ResolvedModuleDataInput>>)[requirement.key]) as Readonly<{ id: string; entries: Readonly<Record<string, Readonly<{ id: string; fields: Readonly<Record<string, unknown>> }>>> }> | undefined;
    if (!source) continue;
    for (const entry of Object.values(source.entries)) {
      for (const locale of site.supportedLocales) {
        const identity = datasTranslationIdentity.entryFields(site.id, source.id, entry.id);
        const translation = readTranslation<Readonly<{ fields?: Readonly<Record<string, unknown>> }>>(identity.namespace, identity.key, locale)?.fields;
        if (locale !== site.defaultLocale && properties.some((property) => property.locale && (!translation || !Object.hasOwn(translation, property.key)))) continue;
        const fields = mergeLocalizedValue(entry.fields, translation) as Readonly<Record<string, unknown>>;
        const text = properties.flatMap((property) => {
          const value = searchableText(fields[property.key], property.type);
          const weight = typeof property.searchable === 'object' ? Math.min(10, Math.max(1, Math.round(property.searchable.weight ?? 1))) : 1;
          return value ? Array.from({ length: weight }, () => value) : [];
        }).join('\n');
        documents.push({ siteId: site.id, moduleKey: requirement.key, entryId: entry.id, locale, text });
      }
    }
  }
  return documents;
}

export function validateModuleQuery(input: ModelQuery, requirement: ManifestModule): void {
  validateQuery(input);
  validateDeclaredFields(input.where, requirement);
  for (const order of input.orderBy ?? []) {
    const [scope, key] = order.path.split('.');
    if (scope === 'fields') {
      if (!propertyByKey(requirement, key)) throw new TypeError(`Unknown field: ${requirement.key}.${key}`);
    } else if (!['id', 'parentId'].includes(order.path)) {
      throw new TypeError(`Unknown attribute: ${order.path}`);
    }
  }
}

function validateDeclaredFields(where: ModelWhere | undefined, requirement: ManifestModule): void {
  if (!where) return;
  for (const key of Object.keys(where.attributes ?? {})) {
    if (!['id', 'parentId'].includes(key)) throw new TypeError(`Unknown attribute: ${key}`);
  }
  for (const key of Object.keys(where.fields ?? {})) {
    if (!propertyByKey(requirement, key)) throw new TypeError(`Unknown field: ${requirement.key}.${key}`);
  }
  for (const child of [...(where.AND ?? []), ...(where.OR ?? [])]) validateDeclaredFields(child, requirement);
  validateDeclaredFields(where.NOT, requirement);
}

function propertyByKey(requirement: ManifestModule, key?: string): ManifestProperty | undefined {
  return key ? requirement.entryProperties?.find((property) => property.key === key) : undefined;
}

function searchableText(value: unknown, type?: string): string {
  if (type && isCmsFlattenFilterType(type)) return extractCmsFilterText(value, type);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => searchableText(item)).filter(Boolean).join(' ');
  if (value && typeof value === 'object') return Object.values(value as Readonly<Record<string, unknown>>).map((item) => searchableText(item)).filter(Boolean).join(' ');
  return '';
}
