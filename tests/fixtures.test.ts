import assert from "node:assert/strict";
import test from "node:test";
import { adaptResolveResult } from "@/platform/theme/source/site-client";
import { createDatasResolveRoute } from "@/platform/theme/datas/resolver";
import { resolveDatasGraph } from "@/platform/theme/datas/graph";
import { moduleDataByKey, pageDataByPath } from "@/platform/theme/datas/registry";
import { validateDatasComposition } from "@/platform/theme/validation/datas";
import { createDatasSearchDocuments } from "@/platform/theme/datas/search";
import { builtInValueTypeNames } from "@/platform/schema";
import theme from "@/manifest";
import site from "@/theme/datas/site";
import menus from "@/theme/datas/menus";
import templates from "@/theme/datas/template";
import storage from "@/theme/datas/storage";

const moduleKeys = [
  "advertisement",
  "application",
  "article",
  "article-cate",
  "catalog",
  "catalog-cate",
  "exhibition",
  "page",
  "product",
  "product-cate",
  "tag",
  "test",
];
const graph = resolveDatasGraph({
  domainHost: "northstar.local",
  locale: "en-us",
  signal: new AbortController().signal,
  dependency: () => {},
}, {}, theme);
const resolve = async (path: string) => {
  const resolvedGraph = await graph;
  return adaptResolveResult(
    await createDatasResolveRoute(
      { host: "northstar.local", path, query: "" },
      theme.modules ?? [],
      resolvedGraph.site,
      theme.site.properties ?? [],
      resolvedGraph,
    ),
  );
};

test("Datas registry matches the current Theme module contract", () => {
  assert.deepEqual([...moduleDataByKey.keys()].sort(), moduleKeys);
  assert.deepEqual(
    (theme.modules ?? []).map((module) => module.key).sort(),
    moduleKeys,
  );
  validateDatasComposition({
    theme,
    site,
    menus,
    modules: moduleDataByKey,
    templates,
  });
  for (const module of theme.modules ?? []) {
    if ((module.kind ?? "page") === "model") {
      assert.equal(moduleDataByKey.get(module.key)?.defaultInstanceKey, undefined);
      continue;
    }
    assert.equal(
      moduleDataByKey.get(module.key)?.defaultInstanceKey,
      `${module.templateKey ?? module.key}.default`,
    );
  }
});

test("Datas Menu registry keys exactly match Theme-owned Menu schemas", () => {
  const { "legal-menu": _legal, ...missingMenu } = menus;
  void _legal;
  assert.throws(
    () =>
      validateDatasComposition({
        theme,
        site,
        menus: missingMenu,
        modules: moduleDataByKey,
        templates,
      }),
    /Missing Theme Menu Datas: legal-menu/,
  );
  assert.throws(
    () =>
      validateDatasComposition({
        theme,
        site,
        menus: { ...menus, unexpected: { id: "40000000-0000-4000-8000-000000000099", items: [] } },
        modules: moduleDataByKey,
        templates,
      }),
    /Unknown Datas Menu: unexpected/,
  );
});

test("Theme exposes the stable legacy content and custom-property contract", () => {
  const modules = new Map(
    (theme.modules ?? []).map((module) => [module.key, module]),
  );
  const keys = (moduleKey: string) =>
    modules.get(moduleKey)?.entryProperties?.map((property) => property.key) ??
    [];

  for (const module of modules.values()) {
    assert.deepEqual(
      module.moduleProperties?.map((property) => property.key),
      ["title", "description", "image"],
    );
    assert.deepEqual(
      module.entryProperties?.slice(0, 3).map((property) => property.key),
      ["title", "description", "image"],
    );
  }
  assert.deepEqual(keys("page"), ["title", "description", "image", "detail1"]);
  assert.deepEqual(keys("advertisement"), [
    "title",
    "description",
    "image",
    "ad_channel",
    "ad_campaign_code",
    "ad_conversion_goal",
    "detail1",
  ]);
  assert.deepEqual(keys("article"), [
    "title",
    "description",
    "image",
    "image1",
    "detail1",
    "related_products",
    "tags",
  ]);
  assert.equal(modules.get("article")?.parentKey, "article-cate");
  assert.equal(modules.get("product")?.parentKey, "product-cate");
  assert.equal(modules.get("catalog")?.parentKey, "catalog-cate");
  assert.equal(modules.get("tag")?.kind, "model");
  assert.equal(keys("product").includes("re-products"), true);
  assert.equal(keys("product").includes("tags"), true);
  assert.equal(keys("product").includes("downloads"), true);
  assert.equal(keys("product").includes("detail2"), true);
  assert.equal(keys("product").includes("image2"), true);
  assert.equal(keys("product").includes("field_isrzeb"), true);
  assert.deepEqual(keys("catalog"), ["title", "description", "image", "pdf"]);
  const testTypes = new Set(
    modules.get("test")?.entryProperties?.map((property) => property.type) ?? [],
  );
  assert.deepEqual(
    [...builtInValueTypeNames].sort(),
    [...testTypes].sort(),
  );
  assert.equal(modules.get("test")?.templateKey, "page");
  assert.deepEqual(
    keys("test").filter((key) =>
      ["module", "modules", "tag-entry", "tag-entries", "dynamic-table"].includes(key),
    ),
    ["module", "modules", "tag-entry", "tag-entries", "dynamic-table"],
  );
  assert.equal(
    modules.get("test")?.entryProperties?.find((property) => property.key === "dynamic-table")?.columnForm,
    "array.title",
  );
  assert.deepEqual(
    modules
      .get("test")
      ?.entryProperties?.find((property) => property.key === "size")
      ?.options?.map((option) => option.value),
    [1, 2],
  );
});

test("Datas type-catalog page resolves", async () => {
  const result = await resolve("/test/type-catalog");
  assert.equal(result.type, "render");
  if (result.type !== "render") return;
  assert.equal(result.payload.module.key, "test");
  assert.equal(result.payload.entry.id, "type-catalog");
  assert.equal(result.payload.template.templateKey, "page");
  assert.equal(result.payload.entry.fields.html, "<p>Type catalog HTML.</p>");
  assert.ok(Array.isArray(result.payload.entry.fields.rich));
  const nested = result.payload.entry.fields.object as { html?: unknown; rich?: unknown };
  assert.equal(nested.html, "<p>Nested HTML.</p>");
  assert.ok(Array.isArray(nested.rich));
});

test("Datas search documents extract rich node text", () => {
  const documents = createDatasSearchDocuments(theme.modules ?? [], site);
  const row = documents.find((document) => document.entryId === "type-catalog" && document.locale === site.defaultLocale);
  assert.ok(row);
  assert.match(row.text, /Rich text content/);
  assert.equal(row.text.includes("paragraph"), false);
});

test("Datas type-catalog fills every test entry property", () => {
  const properties =
    (theme.modules ?? []).find((module) => module.key === "test")
      ?.entryProperties ?? [];
  const fields = moduleDataByKey.get("test")?.entries["type-catalog"]?.fields;
  assert.ok(fields);
  assert.deepEqual(
    Object.keys(fields ?? {}).sort(),
    properties.map((property) => property.key).sort(),
  );
  for (const key of ["files", "images", "audios", "videos", "menus", "forms", "modules", "tag-entries"] as const) {
    const value = fields?.[key];
    assert.ok(Array.isArray(value) && value.length >= 2, `${key} should have 2+ items for extra-count display`);
  }
  assert.equal(
    properties.find((property) => property.key === "object")?.fields?.find((field) => field.key === "featured")?.type,
    "switch",
  );
  assert.equal((fields?.object as { featured?: unknown } | undefined)?.featured, true);
});

test("Datas exposes one valid route for every current page module", () => {
  const expected = new Map([
    ["/", "home"],
    ["/advertisement/campaign", "campaign"],
    ["/application/industrial", "industrial"],
    ["/article/materials-guide", "materials-guide"],
    ["/article-category/insights", "insights"],
    ["/product/industrial-tape", "industrial-tape"],
    ["/product-category/tapes", "tapes"],
    ["/catalog/products", "products"],
    ["/catalog-category/downloads", "downloads"],
    ["/exhibition/expo-2026", "expo-2026"],
    ["/privacy", "privacy"],
    ["/test/type-catalog", "type-catalog"],
  ]);
  for (const [path, id] of expected)
    assert.equal(pageDataByPath.get(path)?.entry.id, id);
});

test("Default Site auxiliary Datas covers pagination and file-backed fields", () => {
  for (const moduleKey of moduleKeys) {
    const entries = moduleDataByKey.get(moduleKey)?.entries;
    assert.ok(entries && "findMany" in entries === false);
    assert.ok(Object.keys(entries).length > 20, `${moduleKey} should span more than one default API page`);
  }

  assert.ok(site.files.length > 20);
  assert.ok(Object.keys(storage.entries).length > 20);

  const product = moduleDataByKey.get("product")?.entries;
  const catalog = moduleDataByKey.get("catalog")?.entries;
  assert.ok(product && "testing-01" in product);
  assert.ok(catalog && "testing-01" in catalog);
  if (!product || !catalog || !("testing-01" in product) || !("testing-01" in catalog)) return;
  const productEntry = product["testing-01"];
  const catalogEntry = catalog["testing-01"];
  assert.notEqual(typeof productEntry, "function");
  assert.notEqual(typeof catalogEntry, "function");
  if (typeof productEntry === "function" || typeof catalogEntry === "function") return;
  assert.equal(productEntry.fields.field_isrzeb.id, "northstar-brand-kit");
  assert.equal(catalogEntry.fields.pdf.id, "northstar-brand-kit");
});

test("Datas home resolves through the normal Layout, Template and Section chain", async () => {
  const result = await resolve("/");
  assert.equal(result.type, "render");
  if (result.type !== "render") return;
  assert.equal(result.payload.module.key, "page");
  assert.equal(result.payload.entry.id, "home");
  assert.equal(result.payload.template.templateKey, "page");
  assert.equal(result.payload.layout.slots["layout.header"][0]?.key, "header");
  assert.equal(result.payload.layout.slots["layout.footer"][0]?.key, "footer");
  assert.equal(result.payload.page.slots["page.main"][0]?.key, "banner");
});

test("Datas menus materialize only current Module links", async () => {
  const result = await resolve("/");
  assert.equal(result.type, "render");
  if (result.type !== "render") return;
  const menu = result.payload.layout.slots["layout.header"][0]?.settings
    .menu as {
    items: readonly { link: { reference?: string; href: string } }[];
  };
  assert.equal(
    menu.items.every(
      (item) =>
        !item.link.reference || /^module\.[a-z0-9-]+$/.test(item.link.reference),
    ),
    true,
  );
  assert.equal(
    menu.items.every((item) => item.link.href.startsWith("/")),
    true,
  );
});

test("Consent policy references resolve to selected Page routes", async () => {
  const result = await resolve("/");
  assert.equal(result.type, "render");
  if (result.type !== "render") return;
  assert.equal(result.payload.consent?.privacyPolicy.href, "/privacy");
  assert.equal(result.payload.consent?.cookiePolicy?.href, "/cookies");
});
