import { validateValueTypeNode } from "@/platform/schema/value-types";
import type { ValueTypeName } from "@/platform/schema/value-types";
import { collectSeoTemplateExpressions } from "./seo-template";
import type {
  ManifestMenu,
  ManifestModule,
  ManifestProperty,
  ManifestSeoTemplate,
  QueryOperator,
  SiteManifest,
} from "./types";
import { defaultViewportMinWidth } from "./viewport";

const propertyKeyPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const searchableTypes = new Set<ValueTypeName>([
  "text",
  "textarea",
  "heading",
  "rich",
]);
const nonSortableTypes = new Set<ValueTypeName>([
  "html",
  "heading",
  "rich",
  "code",
  "select",
  "json",
  "link",
  "links",
  "files",
  "images",
  "audios",
  "videos",
  "modules",
  "menus",
  "forms",
  "object",
  "array",
  "tree",
  "table",
  "spacing",
]);
const aggregatableTypes = new Set<ValueTypeName>(["number", "price"]);
const operatorsByType: Readonly<
  Partial<Record<ValueTypeName, readonly QueryOperator[]>>
> = {
  text: ["equals", "not", "in", "notIn", "contains", "startsWith", "endsWith"],
  textarea: ["equals", "not", "contains", "startsWith", "endsWith"],
  html: ["contains"],
  heading: [
    "equals",
    "not",
    "in",
    "notIn",
    "contains",
    "startsWith",
    "endsWith",
  ],
  rich: ["contains"],
  code: ["contains"],
  number: ["equals", "not", "in", "notIn", "gt", "gte", "lt", "lte"],
  switch: ["equals", "not"],
  date: ["equals", "not", "in", "notIn", "gt", "gte", "lt", "lte"],
  time: ["equals", "not", "in", "notIn", "gt", "gte", "lt", "lte"],
  datetime: ["equals", "not", "in", "notIn", "gt", "gte", "lt", "lte"],
  color: ["equals"],
  json: ["contains"],
  link: ["contains"],
  links: ["contains"],
  file: ["equals", "not", "in", "notIn"],
  files: ["contains"],
  image: ["equals", "not", "in", "notIn"],
  images: ["contains"],
  audio: ["equals", "not", "in", "notIn"],
  audios: ["contains"],
  video: ["equals", "not", "in", "notIn"],
  videos: ["contains"],
  module: ["equals", "not", "in", "notIn"],
  modules: ["contains"],
  menu: ["equals", "not", "in", "notIn"],
  menus: ["contains"],
  form: ["equals", "not", "in", "notIn"],
  forms: ["contains"],
  object: ["contains"],
  array: ["contains"],
  tree: ["contains"],
  table: ["contains"],
  select: ["equals", "not", "in", "notIn"],
  price: ["equals", "not", "gt", "gte", "lt", "lte"],
  spacing: ["contains"],
};

function validateProperties(definitions: readonly ManifestProperty[]) {
  const keys = new Set<string>();
  for (const definition of definitions) {
    if (!propertyKeyPattern.test(definition.key))
      throw new Error(`Invalid property key: ${definition.key}`);
    if (keys.has(definition.key))
      throw new Error(`Duplicate property key: ${definition.key}`);
    keys.add(definition.key);
    validateValueTypeNode(definition, `properties.${definition.key}`);
    if (definition.summary !== undefined) {
      if (!["title", "image"].includes(definition.summary))
        throw new Error(`Invalid property summary: ${definition.key}`);
      if (
        definition.summary === "image" &&
        !["image", "file"].includes(definition.type)
      )
        throw new Error(
          `Property summary image requires image/file type: ${definition.key}`,
        );
      if (
        definition.summary !== "image" &&
        !["text", "textarea", "heading", "html", "rich"].includes(
          definition.type,
        )
      )
        throw new Error(
          `Property summary ${definition.summary} requires text-like type: ${definition.key}`,
        );
    }
    if (definition.searchable && !searchableTypes.has(definition.type))
      throw new Error(
        `Property type cannot be searchable: ${definition.key}`,
      );
    if (
      definition.searchable?.weight !== undefined &&
      (!Number.isFinite(definition.searchable.weight) ||
        definition.searchable.weight <= 0)
    )
      throw new Error(`Invalid searchable weight: ${definition.key}`);
    if (definition.sortable && nonSortableTypes.has(definition.type))
      throw new Error(
        `Property type cannot be sortable: ${definition.key}`,
      );
    if (definition.aggregatable && !aggregatableTypes.has(definition.type))
      throw new Error(
        `Property type cannot be aggregatable: ${definition.key}`,
      );
    if (definition.filterable && !operatorsByType[definition.type]?.length)
      throw new Error(
        `Property type cannot be filterable: ${definition.key}`,
      );
    if (
      typeof definition.filterable === "object" &&
      definition.filterable.operators
    ) {
      const allowed = new Set(operatorsByType[definition.type] ?? []);
      if (
        !definition.filterable.operators.length ||
        definition.filterable.operators.some(
          (operator) => !allowed.has(operator),
        )
      )
        throw new Error(`Invalid filter operators: ${definition.key}`);
    }
  }
}

export function queryOperatorsForProperty(
  definition: ManifestProperty,
): readonly QueryOperator[] {
  if (
    typeof definition.filterable === "object" &&
    definition.filterable.operators
  )
    return definition.filterable.operators;
  return operatorsByType[definition.type] ?? [];
}

function validateSiteManifest(definition: SiteManifest) {
  validateProperties(definition.site.properties ?? []);
  validateMenus(definition.menu ?? []);
  const menuKeys = new Set((definition.menu ?? []).map((menu) => menu.key));
  const bindingTargets = new Set<string>();
  for (const binding of definition.installation?.bindings ?? []) {
    const target = `${binding.target.ownerType}:${binding.target.ownerKey}:${binding.target.path}`;
    if (bindingTargets.has(target))
      throw new Error(`Duplicate installation binding target: ${target}`);
    bindingTargets.add(target);
    if (
      !binding.target.ownerKey.trim() ||
      !binding.target.path.trim() ||
      binding.target.path.split("/").some((part) => !part)
    )
      throw new Error(`Invalid installation binding target: ${target}`);
    if (binding.resource.type === "menu" && !menuKeys.has(binding.resource.key))
      throw new Error(
        `Unknown installation Menu resource: ${binding.resource.key}`,
      );
  }
  const viewport = definition.viewport;
  if (viewport) {
    const strategy = viewport.strategy ?? "responsive";
    const positiveInteger = (value: number | undefined) =>
      value === undefined || (Number.isSafeInteger(value) && value > 0);
    const minWidth = viewport.supported?.minWidth ?? viewport.minWidth;
    const maxWidth = viewport.supported?.maxWidth ?? viewport.maxWidth;
    if (
      !positiveInteger(minWidth) ||
      !positiveInteger(maxWidth) ||
      !positiveInteger(viewport.width) ||
      !positiveInteger(viewport.height)
    )
      throw new Error("Viewport dimensions must be positive integers");
    if ((minWidth ?? 375) < 375)
      throw new Error("Viewport minWidth cannot be less than 375");
    if (minWidth !== undefined && maxWidth !== undefined && minWidth > maxWidth)
      throw new Error("Viewport minWidth exceeds maxWidth");
    if (strategy === "fixed" && viewport.width === undefined)
      throw new Error("Fixed viewport requires width");
    if (strategy !== "fixed" && viewport.width !== undefined)
      throw new Error("Only fixed viewport can declare width");
    if (
      viewport.width !== undefined &&
      (viewport.width < (minWidth ?? defaultViewportMinWidth) ||
        (maxWidth !== undefined && viewport.width > maxWidth))
    )
      throw new Error("Fixed viewport width is outside supported bounds");
    if (strategy === "variants" && !viewport.variants?.length)
      throw new Error("Variants viewport requires variants");
    if (strategy !== "variants" && viewport.variants !== undefined)
      throw new Error("Only variants viewport can declare variants");
    const variants = new Set<string>();
    for (const variant of viewport.variants ?? []) {
      if (!/^[a-z][a-z0-9_-]*$/.test(variant.key) || variants.has(variant.key))
        throw new Error(`Invalid viewport variant: ${variant.key}`);
      variants.add(variant.key);
      if (
        !positiveInteger(variant.when.minWidth) ||
        !positiveInteger(variant.when.maxWidth)
      )
        throw new Error(`Invalid viewport variant range: ${variant.key}`);
      if (
        variant.when.minWidth !== undefined &&
        variant.when.maxWidth !== undefined &&
        variant.when.minWidth > variant.when.maxWidth
      )
        throw new Error(
          `Viewport variant minWidth exceeds maxWidth: ${variant.key}`,
        );
    }
    if (strategy === "variants") {
      const lowerBound = minWidth ?? defaultViewportMinWidth;
      const ordered = [...(viewport.variants ?? [])].sort(
        (left, right) =>
          (left.when.minWidth ?? lowerBound) -
          (right.when.minWidth ?? lowerBound),
      );
      let nextWidth = lowerBound;
      for (const variant of ordered) {
        if ((variant.when.minWidth ?? lowerBound) !== nextWidth)
          throw new Error(
            `Viewport variants must cover supported widths without gaps or overlaps: ${variant.key}`,
          );
        if (
          maxWidth !== undefined &&
          (variant.when.maxWidth === undefined ||
            variant.when.maxWidth > maxWidth)
        )
          throw new Error(
            `Viewport variant exceeds supported bounds: ${variant.key}`,
          );
        nextWidth = (variant.when.maxWidth ?? Number.POSITIVE_INFINITY) + 1;
      }
      if (
        nextWidth !== Number.POSITIVE_INFINITY &&
        (maxWidth === undefined || nextWidth <= maxWidth)
      )
        throw new Error(
          "Viewport variants must cover all supported widths",
        );
    }
  }
  const modules = new Map<string, ManifestModule>();
  for (const module of definition.modules ?? []) {
    if (modules.has(module.key))
      throw new Error(`Duplicate module key: ${module.key}`);
    if (module.sitemap !== undefined && typeof module.sitemap !== "boolean")
      throw new Error(`Invalid module sitemap flag: ${module.key}`);
    modules.set(module.key, module);
    validateProperties(module.moduleProperties ?? []);
    validateProperties(module.entryProperties ?? []);
    const kind = manifestModuleKind(module);
    if (kind === "page" && module.routePrefix === undefined)
      throw new Error(`Page module requires routePrefix: ${module.key}`);
    if (
      kind === "model" &&
      (module.routePrefix !== undefined ||
        module.templateKey !== undefined ||
        module.sitemap !== undefined)
    )
      throw new Error(
        `Model module cannot declare page fields: ${module.key}`,
      );
  }
  for (const module of modules.values()) {
    for (const property of [
      ...(module.moduleProperties ?? []),
      ...(module.entryProperties ?? []),
    ]) {
      const isModuleReference =
        property.type === "module" || property.type === "modules";
      if (isModuleReference && !property.reference)
        throw new Error(
          `Module property requires reference: ${module.key}.${property.key}`,
        );
      if (isModuleReference && property.locale)
        throw new Error(
          `Module property cannot be localized: ${module.key}.${property.key}`,
        );
      if (!isModuleReference && property.reference)
        throw new Error(
          `Only module properties can declare reference: ${module.key}.${property.key}`,
        );
      if (property.reference && !modules.has(property.reference))
        throw new Error(
          `Unknown referenced module: ${module.key}.${property.key} -> ${property.reference}`,
        );
    }
  }
  for (const module of modules.values())
    if (module.parentKey && !modules.has(module.parentKey))
      throw new Error(`Unknown parent module: ${module.parentKey}`);
  for (const module of modules.values()) {
    const visited = new Set<string>([module.key]);
    let parentKey = module.parentKey;
    while (parentKey) {
      if (visited.has(parentKey))
        throw new Error(`Cyclic module parent: ${module.key}`);
      visited.add(parentKey);
      parentKey = modules.get(parentKey)?.parentKey;
    }
  }
  const seoKeys = new Set<string>();
  for (const seo of definition.seo ?? []) {
    if (seoKeys.has(seo.key))
      throw new Error(`Duplicate SEO key: ${seo.key}`);
    seoKeys.add(seo.key);
    if (seo.owner.type === "module" && !modules.has(seo.owner.key))
      throw new Error(`Unknown SEO owner module: ${seo.owner.key}`);
    if (seo.locale !== undefined && seo.locale !== "*") {
      try {
        new Intl.Locale(seo.locale);
      } catch {
        throw new Error(`Invalid SEO locale: ${seo.key}`);
      }
    }
    if (!seo.content.title.trim())
      throw new Error(`SEO template requires title: ${seo.key}`);
    validateSeoTemplateContent(seo);
    validateSeoTemplateVariables(seo, definition, modules);
  }
}

function validateMenus(menus: readonly ManifestMenu[]) {
  const keys = new Set<string>();
  for (const menu of menus) {
    if (!propertyKeyPattern.test(menu.key) || keys.has(menu.key))
      throw new Error(`Invalid or duplicate menu key: ${menu.key}`);
    keys.add(menu.key);
    validateProperties(menu.properties ?? []);
  }
}

const seoContentKeys = new Set([
  "title",
  "description",
  "robots",
  "icons",
  "meta",
  "links",
  "openGraph",
  "twitter",
  "jsonLd",
]);

function validateSeoTemplateContent(seo: ManifestSeoTemplate) {
  const content = seo.content as Readonly<Record<string, unknown>>;
  for (const key of Object.keys(content))
    if (!seoContentKeys.has(key))
      throw new Error(`Unknown SEO template field: ${seo.key}.${key}`);
  if (
    content.description !== undefined &&
    typeof content.description !== "string"
  )
    throw new Error(`SEO template description must be text: ${seo.key}`);
  if (content.robots !== undefined) {
    if (
      !content.robots ||
      typeof content.robots !== "object" ||
      Array.isArray(content.robots)
    )
      throw new Error(`SEO template robots must be an object: ${seo.key}`);
    for (const value of Object.values(content.robots))
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((item) => typeof item !== "string")
      )
        throw new Error(
          `SEO template robots values must be non-empty string arrays: ${seo.key}`,
        );
  }
  for (const field of ["icons", "meta", "links", "jsonLd"] as const)
    if (content[field] !== undefined && !Array.isArray(content[field]))
      throw new Error(`SEO template ${field} must be an array: ${seo.key}`);
  for (const field of ["openGraph", "twitter"] as const)
    if (
      content[field] !== undefined &&
      (!content[field] ||
        typeof content[field] !== "object" ||
        Array.isArray(content[field]))
    )
      throw new Error(`SEO template ${field} must be an object: ${seo.key}`);
}

function validateSeoTemplateVariables(
  seo: ManifestSeoTemplate,
  _definition: SiteManifest,
  _modules: ReadonlyMap<string, ManifestModule>,
) {
  for (const expression of collectSeoTemplateExpressions(seo.content)) {
    for (const path of [
      expression.path,
      ...expression.filters.flatMap((filter) =>
        filter.arguments.filter((argument) =>
          /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_-]+)*$/.test(argument),
        ),
      ),
    ]) {
      const parts = path.split(".");
      if (parts[0] === "route") continue;
      if (parts[0] === "locale" && (parts[1] === "code" || parts[1] === "og"))
        continue;
      if (parts[0] === "site" && parts[1] === "fields" && parts[2]) continue;
      if (parts[0] === "entry" && parts[1] === "page") continue;
      if (parts[0] === "entry" && parts[1] === "fields" && parts[2]) continue;
      if (parts[0] === "parentEntry" && parts[1] === "page") continue;
      if (parts[0] === "parentEntry" && parts[1] === "fields" && parts[2])
        continue;
      throw new Error(`Unknown SEO template variable: ${seo.key} -> ${path}`);
    }
  }
}

function manifestModuleKind(module: ManifestModule): "page" | "model" {
  const kind = module.kind ?? "page";
  if (kind !== "page" && kind !== "model")
    throw new Error(`Invalid module kind: ${module.key}`);
  return kind;
}

function normalizeManifestModule<T extends ManifestModule>(module: T): T {
  const kind = manifestModuleKind(module);
  if (kind === "model") return { ...module, kind };
  return { ...module, kind, templateKey: module.templateKey ?? module.key };
}

export const defineSiteManifest = <T extends SiteManifest>(definition: T): T => {
  const normalized = definition.modules
    ? { ...definition, modules: definition.modules.map(normalizeManifestModule) }
    : definition;
  validateSiteManifest(normalized);
  return normalized as T;
};

export const defineSiteManifestMenu = <T extends readonly ManifestMenu[]>(
  definition: T,
): T => {
  validateMenus(definition);
  return definition;
};

export const defineSiteManifestModule = <T extends ManifestModule>(
  definition: T,
): T => normalizeManifestModule(definition);

export const defineSiteManifestProperties = <
  T extends readonly ManifestProperty[],
>(
  definitions: T,
): T => {
  validateProperties(definitions);
  return definitions;
};
