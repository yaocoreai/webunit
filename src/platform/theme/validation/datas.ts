import type {
  ConsentDataInput,
  ConsentPolicyReference,
  DefinedAssetEntries,
  DocumentInjectionDataInput,
  ManifestDataInput,
  MenuDataInput,
  SeoDataInput,
  SiteDataInput,
} from "@/platform/theme/define/datas";
import { isCmsLinkValue } from "@/platform/theme/define/cms-link";
import { isPublicContentUrl } from "@/platform/theme/define/public-content-url";
import type { SiteManifest, ManifestProperty } from "@/platform/manifest";
import {
  formatAssetReference,
  formatModuleReference,
  isCmsAssetRef,
  isCmsFormRef,
  isCmsMenuRef,
  isCmsModuleRef,
  isSpacingBoxValue,
  parseCmsReference,
  resolveTableColumns,
  validateTableValue,
  validateValueTypeValue,
  type CmsAssetType,
} from "@/platform/schema";
import { isValidStoredPriceValue } from "@/platform/theme/content/price";
import type { DatasModule } from "@/platform/theme/datas/model";

type Fields = Readonly<Record<string, unknown>>;
type TemplateRecord = Readonly<{ id: string; templateKey: string }>;
const datasIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function validateDatasOwnerIds(
  input: Readonly<{
    seo: SeoDataInput["templates"];
    manifests: ManifestDataInput["templates"];
    documentInjections: readonly DocumentInjectionDataInput[];
  }>,
) {
  for (const [owner, records] of Object.entries(input)) {
    const ids = records.map((record) => record.id);
    if (
      ids.some((id) => !datasIdPattern.test(id)) ||
      new Set(ids).size !== ids.length
    )
      throw new Error(`Invalid or duplicate Datas ${owner} id`);
  }
}

const isAssetOrMenuReference = (value: unknown, assetType?: CmsAssetType): boolean => {
  if (assetType) return isCmsAssetRef(value) && value.reference === formatAssetReference(assetType);
  return isCmsAssetRef(value) || isCmsMenuRef(value);
};

const isModuleReference = (
  value: unknown,
  expectedReference?: string,
): value is Readonly<{ id: string; reference: `module.${string}` }> => {
  if (!isCmsModuleRef(value)) return false;
  return !expectedReference || value.reference === formatModuleReference(expectedReference);
};

const isHeading = (value: unknown): boolean => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    Object.keys(value).every((key) => key === "level" || key === "value") &&
    Number.isInteger((value as { level?: unknown }).level) &&
    Number((value as { level?: unknown }).level) >= 1 &&
    Number((value as { level?: unknown }).level) <= 6 &&
    typeof (value as { value?: unknown }).value === "string"
  );
};

function matchesPropertyType(
  value: unknown,
  definition: ManifestProperty,
  scope?: Fields,
) {
  const type = definition.type;
  if (
    [
      "text",
      "textarea",
      "date",
      "time",
      "datetime",
      "color",
    ].includes(type)
  )
    return typeof value === "string";
  if (type === "number")
    return typeof value === "number" && Number.isFinite(value);
  if (type === "switch") return typeof value === "boolean";
  if (type === "heading") return isHeading(value);
  if (type === "spacing") return isSpacingBoxValue(value, { allowNegative: true });
  if (type === "select") return definition.options?.some((option) => option.value === value) ?? false;
  if (type === "table") return Array.isArray(value)
    && value.length >= (definition.minItems ?? 0)
    && value.length <= (definition.maxItems ?? Number.POSITIVE_INFINITY)
    && validateTableValue(resolveTableColumns(definition, scope), value);
  if (type === "menu") return isCmsMenuRef(value);
  if (type === "menus") return Array.isArray(value) && value.every(isCmsMenuRef);
  if (type === "form") return isCmsFormRef(value);
  if (type === "forms") return Array.isArray(value) && value.every(isCmsFormRef);
  if (["html", "rich", "code", "json", "object", "array", "tree"].includes(type))
    return validateValueTypeValue(definition, value, scope);
  if (type === "link") return isCmsLinkValue(value);
  if (type === "links") return Array.isArray(value) && value.every(isCmsLinkValue);
  if (["file", "image", "audio", "video"].includes(type))
    return isAssetOrMenuReference(value, type as CmsAssetType);
  if (type === "module") return isModuleReference(value, definition.reference);
  if (["files", "images", "audios", "videos"].includes(type))
    return Array.isArray(value) && value.every((item) => isAssetOrMenuReference(item, type.slice(0, -1) as CmsAssetType));
  if (type === "modules")
    return Array.isArray(value) && value.every((item) => isModuleReference(item, definition.reference));
  if (type === "price") return isValidStoredPriceValue(value);
  return false;
}

function validateFields(
  owner: string,
  fields: Fields,
  definitions: readonly ManifestProperty[] = [],
) {
  const expected = new Map(
    definitions.map((definition) => [definition.key, definition]),
  );
  for (const key of Object.keys(fields))
    if (!expected.has(key))
      throw new Error(`Unknown Datas field: ${owner}.${key}`);
  for (const definition of definitions) {
    const value = fields[definition.key];
    if (definition.required && value === undefined)
      throw new Error(
        `Missing required Datas field: ${owner}.${definition.key}`,
      );
    if (value !== undefined && !matchesPropertyType(value, definition, fields))
      throw new Error(`Invalid Datas field type: ${owner}.${definition.key}`);
  }
}

export const validateDatasEntryFields = (
  moduleKey: string,
  entryId: string,
  fields: Fields,
  definitions: readonly ManifestProperty[] = [],
) => validateFields(`module.${moduleKey}.${entryId}`, fields, definitions);

export function validatePartialDatasFields(
  owner: string,
  value: unknown,
  definitions: readonly ManifestProperty[] = [],
) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Invalid Datas translation fields: ${owner}`);
  const fields = value as Fields;
  const expected = new Map(
    definitions.map((definition) => [definition.key, definition]),
  );
  for (const [key, field] of Object.entries(fields)) {
    const definition = expected.get(key);
    if (!definition) throw new Error(`Unknown Datas field: ${owner}.${key}`);
    if (!matchesPropertyType(field, definition, fields))
      throw new Error(`Invalid Datas field type: ${owner}.${key}`);
  }
}

export function validateLocalizedDatasFields(
  input: Readonly<{
    theme: SiteManifest;
    siteFields: Fields;
    menus: MenuDataInput;
    modules: ReadonlyMap<string, DatasModule>;
  }>,
) {
  validateFields("site", input.siteFields, input.theme.site.properties);
  for (const [menuKey, menu] of Object.entries(input.menus)) {
    const visit = (items: typeof menu.items): void => {
      for (const item of items) {
        validateFields(
          `menu.${menuKey}.${item.id}`,
          item.fields,
          input.theme.menu?.find((menu) => menu.key === menuKey)?.properties,
        );
        visit(item.children);
      }
    };
    visit(menu.items);
  }
  const definitions = new Map(
    (input.theme.modules ?? []).map((module) => [module.key, module]),
  );
  for (const [moduleKey, module] of input.modules) {
    const definition = definitions.get(moduleKey);
    if (!definition) continue;
    validateFields(
      `module.${moduleKey}`,
      module.fields,
      definition.moduleProperties,
    );
    for (const entry of Object.values(module.entries))
      validateFields(
        `module.${moduleKey}.${entry.id}`,
        entry.fields,
        definition.entryProperties,
      );
  }
}

export function validateDatasComposition(
  input: Readonly<{
    theme: SiteManifest;
    site: SiteDataInput;
    menus: MenuDataInput;
    modules: ReadonlyMap<string, DatasModule>;
    templates: Readonly<Record<string, TemplateRecord>>;
    queryModuleKeys?: ReadonlySet<string>;
  }>,
) {
  validateFields("site", input.site.fields, input.theme.site.properties);
  const menuDefinitions = new Map(
    (input.theme.menu ?? []).map((menu) => [menu.key, menu]),
  );
  for (const id of menuDefinitions.keys())
    if (!Object.hasOwn(input.menus, id))
      throw new Error(`Missing Theme Menu Datas: ${id}`);
  for (const [menuKey, menu] of Object.entries(input.menus)) {
    const menuDefinition = menuDefinitions.get(menuKey);
    if (!menuDefinition) throw new Error(`Unknown Datas Menu: ${menuKey}`);
    const visit = (items: typeof menu.items): void => {
      for (const item of items) {
        validateFields(
          `menu.${menuKey}.${item.id}`,
          item.fields,
          menuDefinition.properties,
        );
        visit(item.children);
      }
    };
    visit(menu.items);
  }

  const definitions = new Map(
    (input.theme.modules ?? []).map((module) => [module.key, module]),
  );
  for (const key of definitions.keys())
    if (!input.modules.has(key))
      throw new Error(`Missing Theme Module Datas: ${key}`);
  for (const [moduleKey, module] of input.modules) {
    const definition = definitions.get(moduleKey);
    if (!definition) throw new Error(`Unknown Datas Module: ${moduleKey}`);
    if ((definition.kind ?? "page") !== module.kind)
      throw new Error(`Datas Module kind mismatch: ${moduleKey}`);
    if ((definition.parentKey ?? undefined) !== module.parentKey)
      throw new Error(`Datas Module parent mismatch: ${moduleKey}`);
    if (module.kind === "page") {
      const defaultTemplate = input.templates[module.defaultInstanceKey!];
      if (
        !defaultTemplate ||
        defaultTemplate.templateKey !== (definition.templateKey ?? definition.key)
      )
        throw new Error(`Datas Module Template mismatch: ${moduleKey}`);
    }
    validateFields(
      `module.${moduleKey}`,
      module.fields,
      definition.moduleProperties,
    );
    for (const entry of Object.values(module.entries)) {
      validateFields(
        `module.${moduleKey}.${entry.id}`,
        entry.fields,
        definition.entryProperties,
      );
      for (const property of definition.entryProperties ?? []) {
        if (
          (property.type !== "module" && property.type !== "modules") ||
          !property.reference
        )
          continue;
        const target = input.modules.get(property.reference);
        const references =
          property.type === "module"
            ? [entry.fields[property.key]]
            : entry.fields[property.key];
        for (const reference of Array.isArray(references) ? references : []) {
          if (
            isModuleReference(reference, property.reference) &&
            !input.queryModuleKeys?.has(property.reference) &&
            !target?.entries[reference.id]
          ) {
            throw new Error(
              `Unknown Datas reference: ${moduleKey}.${entry.id}.${property.key} -> ${property.reference}.${reference.id}`,
            );
          }
        }
      }
      if (entry.page) {
        const selectedTemplate = input.templates[entry.page.instanceKey];
        if (
          !selectedTemplate ||
          selectedTemplate.templateKey !== (definition.templateKey ?? definition.key)
        )
          throw new Error(
            `Datas Page Template mismatch: ${moduleKey}.${entry.id}`,
          );
      }
    }
  }
}

export function validateDatasRuntimeExtras(
  input: Readonly<{
    consent: ConsentDataInput;
    documentInjections: readonly DocumentInjectionDataInput[];
    storages: DefinedAssetEntries;
    modules: ReadonlyMap<string, DatasModule>;
  }>,
) {
  for (const reference of [
    input.consent.privacyPolicy,
    input.consent.cookiePolicy,
  ].filter(Boolean) as readonly ConsentPolicyReference[]) {
    const parsed = parseCmsReference(reference.reference);
    if (!parsed || parsed.kind !== "module")
      throw new Error(`Unknown Datas Consent policy: ${reference.id}`);
    if (!input.modules.get(parsed.moduleKey)?.entries[reference.id]?.page)
      throw new Error(`Unknown Datas Consent policy: ${reference.id}`);
  }
  if (
    !Number.isSafeInteger(input.consent.version) ||
    input.consent.version < 1 ||
    !Number.isSafeInteger(input.consent.maxAgeDays) ||
    input.consent.maxAgeDays < 1
  )
    throw new Error("Invalid Datas Consent lifetime");
  if (input.consent.display.mode === "regions") {
    if (
      !input.consent.display.countryCodes.length ||
      input.consent.display.countryCodes.some(
        (code) => !/^[a-z]{2}$/.test(code),
      ) ||
      input.consent.display.regionCodes?.some(
        (code) => !/^[a-z0-9-]{1,16}$/.test(code),
      )
    )
      throw new Error("Invalid Datas Consent regions");
  }

  const injectionIds = new Set<string>();
  for (const injection of input.documentInjections) {
    if (
      !injection.id ||
      injectionIds.has(injection.id) ||
      (injection.remark !== undefined &&
        (typeof injection.remark !== "string" ||
          injection.remark.length > 500)) ||
      !Array.isArray(injection.snippets) ||
      injection.snippets.length < 1 ||
      injection.snippets.length > 16 ||
      !Number.isSafeInteger(injection.sortOrder)
    )
      throw new Error(`Invalid Datas DocumentInjection: ${injection.id}`);
    injectionIds.add(injection.id);
    if (
      !["active", "disabled"].includes(injection.status) ||
      new Set(injection.requiredConsent).size !==
        injection.requiredConsent.length ||
      injection.requiredConsent.some(
        (purpose) =>
          !["analytics", "marketing", "preferences", "saleOfData"].includes(
            purpose,
          ),
      )
    )
      throw new Error(
        `Invalid Datas DocumentInjection contract: ${injection.id}`,
      );
    for (const [index, snippet] of injection.snippets.entries()) {
      if (
        !snippet.code ||
        !["head-start", "head-end", "body-start", "body-end"].includes(
          snippet.placement,
        ) ||
        /<\/?(?:html|head|body)(?:\s|>)/i.test(snippet.code) ||
        /document\.write\s*\(/i.test(snippet.code)
      )
        throw new Error(
          `Invalid Datas DocumentInjection snippet: ${injection.id}.${index}`,
        );
    }
  }

  for (const [key, storage] of Object.entries(input.storages)) {
    const url = storage.delivery.url;
    if (!isPublicContentUrl(url))
      throw new Error(`Invalid Datas Storage delivery URL: ${key}`);
    if (
      storage.delivery.type === "embed" &&
      storage.type !== "audio" &&
      storage.type !== "video"
    )
      throw new Error(`Invalid Datas Storage embed type: ${key}`);
    if (storage.poster && !isPublicContentUrl(storage.poster.url))
      throw new Error(`Invalid Datas Storage poster URL: ${key}`);
  }
}
