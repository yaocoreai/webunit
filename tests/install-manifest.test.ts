import assert from "node:assert/strict";
import test from "node:test";
import {
  defineSection,
  isSlotAvailableAtWidth,
} from "@/platform/theme";
import {
  defineSiteManifest,
  defineSiteManifestProperties,
  queryOperatorsForProperty,
  resolveViewportMetaContent,
  resolveViewportVariant,
  resolveViewportWidth,
} from "@/platform/manifest";
import { createInstallationSettings } from "@/platform/theme/installation/settings";
import {
  sectionSettings,
  templateSettings,
} from "@/platform/generated/theme/setting-runtime";
import { layoutSetting, siteManifest } from '@/platform/generated/theme/definition';

async function createManifest() {
  const [manifest, layout, templates, sections] = await Promise.all([
    siteManifest().then((module) => module.default),
    layoutSetting().then((module) => module.default),
    Promise.all(
      Object.values(templateSettings).map(
        async (load) => (await load()).default,
      ),
    ),
    Promise.all(
      Object.values(sectionSettings).map(
        async (load) => (await load()).default,
      ),
    ),
  ]);
  return createInstallationSettings({ manifest, layout, templates, sections });
}

test("site manifest helpers and registry derive type and key", async () => {
  const [manifest, layout, template, section] = await Promise.all([
    siteManifest().then((module) => module.default),
    layoutSetting().then((module) => module.default),
    templateSettings.page().then((module) => module.default),
    sectionSettings.banner().then((module) => module.default),
  ]);
  assert.equal(layout.type, "layout");
  assert.equal("key" in layout, false);
  assert.deepEqual(
    { type: template.type, key: template.key },
    { type: "template", key: "page" },
  );
  assert.deepEqual(
    { type: section.type, key: section.key },
    { type: "section", key: "banner" },
  );
  assert.ok(
    (await createManifest()).resources.every(
      (item) =>
        item.ownerType !== "layout" || item.ownerKey === manifest.package.key,
    ),
  );
});

test("viewport contract uses 375 minimum and keeps fixed viewports explicit", () => {
  assert.equal(resolveViewportWidth(undefined, 320), 375);
  assert.equal(
    resolveViewportWidth(
      { strategy: "fixed", minWidth: 375, width: 1500 },
      390,
    ),
    1500,
  );
  assert.equal(
    resolveViewportWidth(
      { strategy: "fixed", minWidth: 375, width: 1500 },
      1920,
    ),
    1920,
  );
  assert.equal(
    resolveViewportWidth(
      { strategy: "responsive", supported: { minWidth: 500, maxWidth: 1200 } },
      1600,
    ),
    1200,
  );
  assert.equal(
    resolveViewportMetaContent({ strategy: "fixed", width: 1500 }),
    "width=1500",
  );
  assert.equal(
    resolveViewportMetaContent({ strategy: "responsive", minWidth: 375 }),
    "width=device-width, initial-scale=1",
  );
  assert.equal(
    isSlotAvailableAtWidth({ availableWhen: { maxWidth: 767 } }, 375),
    true,
  );
  const variants = {
    strategy: "variants",
    variants: [
      { key: "mobile", when: { minWidth: 375, maxWidth: 767 } },
      { key: "desktop", when: { minWidth: 768 } },
    ],
  } as const;
  assert.equal(resolveViewportVariant(variants, 390)?.key, "mobile");
  assert.equal(resolveViewportVariant(variants, 1440)?.key, "desktop");
  assert.doesNotThrow(() =>
    defineSiteManifest({
      package: { key: "variants", name: "Variants", version: "1.0.0" },
      viewport: variants,
      site: {},
    }),
  );
  assert.throws(
    () =>
      defineSiteManifest({
        package: { key: "gap", name: "Gap", version: "1.0.0" },
        viewport: {
          strategy: "variants",
          variants: [{ key: "desktop", when: { minWidth: 768 } }],
        },
        site: {},
      }),
    /without gaps or overlaps/,
  );
  assert.throws(
    () =>
      defineSiteManifest({
        package: { key: "small", name: "Small", version: "1.0.0" },
        viewport: { minWidth: 374 },
        site: {},
      }),
    /cannot be less than 375/,
  );
});

test("detail properties use localized HTML fields", async () => {
  const manifest = await createManifest();
  const detailProperties = manifest.modules
    .flatMap((module) => module.entryProperties ?? [])
    .filter((property) => /^detail\d+$/.test(property.key));
  assert.equal(detailProperties.length, 6);
  assert.ok(
    detailProperties.every(
      (property) => property.type === "html" && property.locale === true,
    ),
  );
});

test("installation settings expand Theme requirements deterministically", async () => {
  const first = await createManifest();
  const second = await createManifest();
  assert.deepEqual(first, second);
  assert.equal(first.installation, undefined);
  const siteProperties = (
    first.site as { properties: Array<Record<string, unknown>> }
  ).properties;
  assert.equal(siteProperties[0]?.label, "Site title");
  assert.equal("name" in (siteProperties[0] ?? {}), false);
  assert.equal(
    first.templates.find((template) => template.key === "error")?.type,
    "template",
  );
  assert.deepEqual(
    first.templateInstances.map((item) => item.instanceKey),
    [
      "advertisement.default",
      "application.default",
      "article.default",
      "article-cate.default",
      "catalog.default",
      "catalog-cate.default",
      "error.default",
      "exhibition.default",
      "page.default",
      "product.default",
      "product-cate.default",
    ],
  );
  assert.deepEqual(first.templateInstances[6], {
    templateKey: "error",
    instanceKey: "error.default",
    groupKey: "error",
    moduleKey: null,
  });
  assert.ok(
    first.resources.some(
      (item) => item.ownerType === "section" && item.resourceType === "menu",
    ),
  );
  assert.ok(
    first.resources.some(
      (item) =>
        item.ownerType === "section" &&
        item.resourceType === "link" &&
        item.multiple === false,
    ),
  );
  assert.ok(
    first.resources.some(
      (item) =>
        item.ownerType === "section" &&
        item.resourceType === "link" &&
        item.multiple === true,
    ),
  );
});

test("manifest property helper rejects invalid frontend definitions", () => {
  assert.throws(
    () =>
      defineSiteManifest({
        package: { key: "invalid", name: "Invalid", version: "1.0.0" },
        site: {},
        menu: [{ key: "main-menu" }, { key: "main-menu" }],
      }),
    /duplicate menu key/i,
  );
  assert.throws(
    () =>
      defineSiteManifest({
        package: { key: "invalid", name: "Invalid", version: "1.0.0" },
        site: {},
        menu: [{ key: "Bad Menu" }],
      }),
    /menu key/i,
  );
  assert.throws(
    () =>
      defineSiteManifestProperties([{ key: "Bad-Key", label: "Bad", type: "text" }]),
    /Invalid property key/,
  );
  assert.throws(
    () =>
      defineSiteManifestProperties([
        { key: "title", label: "Title", type: "text" },
        { key: "title", label: "Duplicate title", type: "text" },
      ]),
    /Duplicate property key/,
  );
  assert.throws(
    () =>
      defineSiteManifest({
        package: { key: "invalid", name: "Invalid", version: "1.0.0" },
        site: {},
        modules: [
          {
            key: "blog",
            name: "Blogs",
            kind: "model",
            entryProperties: [
              { key: "author", label: "Author", type: "module" },
            ],
          },
        ],
      }),
    /Module (?:property|value type) requires reference/,
  );
  assert.throws(
    () =>
      defineSiteManifest({
        package: { key: "invalid", name: "Invalid", version: "1.0.0" },
        site: {},
        modules: [
          {
            key: "blog",
            name: "Blogs",
            kind: "model",
            entryProperties: [
              {
                key: "author",
                label: "Author",
                type: "module",
                reference: "missing",
              },
            ],
          },
        ],
      }),
    /Unknown referenced module/,
  );
  assert.doesNotThrow(() =>
    defineSiteManifest({
      package: { key: "invalid", name: "Invalid", version: "1.0.0" },
      site: { properties: [{ key: "title", label: "Title", type: "text" }] },
      modules: [
        {
          key: "blog",
          name: "Blogs",
          kind: "page",
          routePrefix: "/blogs",
          templateKey: "blog",
          entryProperties: [{ key: "title", label: "Title", type: "text" }],
        },
      ],
      seo: [
        {
          key: "blog-default",
          label: "Blog",
          owner: { type: "module", key: "blog" },
          content: { title: "{{entry.fields.missing}}" },
        },
      ],
    }),
  );
  assert.throws(
    () =>
      defineSiteManifest({
        package: { key: "invalid", name: "Invalid", version: "1.0.0" },
        site: { properties: [{ key: "title", label: "Title", type: "text" }] },
        modules: [
          {
            key: "blog",
            name: "Blogs",
            kind: "page",
            routePrefix: "/blogs",
            templateKey: "blog",
            entryProperties: [{ key: "title", label: "Title", type: "text" }],
          },
        ],
        seo: [
          {
            key: "blog-default",
            label: "Blog",
            owner: { type: "module", key: "blog" },
            content: { title: "{{unknown.value}}" },
          },
        ],
      }),
    /Unknown SEO template variable/,
  );
  assert.throws(
    () =>
      defineSiteManifest({
        package: { key: "invalid", name: "Invalid", version: "1.0.0" },
        site: {},
        seo: [
          {
            key: "site-default",
            label: "Site",
            owner: { type: "site" },
            content: { title: "Title", social: {} } as never,
          },
        ],
      }),
    /Unknown SEO template field/,
  );
});

test("manifest modules default kind to page and templateKey to key", () => {
  const manifest = defineSiteManifest({
    package: { key: "defaults", name: "Defaults", version: "1.0.0" },
    site: {},
    modules: [
      { key: "blog", name: "Blogs", routePrefix: "/blogs" },
      { key: "author", name: "Authors", kind: "model" },
    ],
  });
  assert.deepEqual(manifest.modules, [
    { key: "blog", name: "Blogs", kind: "page", routePrefix: "/blogs", templateKey: "blog" },
    { key: "author", name: "Authors", kind: "model" },
  ]);
  assert.throws(
    () =>
      defineSiteManifest({
        package: { key: "invalid", name: "Invalid", version: "1.0.0" },
        site: {},
        modules: [{ key: "blog", name: "Blogs", kind: "page" }],
      }),
    /Page module requires routePrefix/,
  );
  assert.throws(
    () =>
      defineSiteManifest({
        package: { key: "invalid", name: "Invalid", version: "1.0.0" },
        site: {},
        modules: [{ key: "author", name: "Authors", kind: "model", templateKey: "page" }],
      }),
    /Model module cannot declare page fields/,
  );
});

test("media settings reuse file resources and collection item limits", () => {
  const section = defineSection({
    label: "Media",
    groups: ["content"],
    messages: {},
    settings: [
      { type: "image", id: "cover", label: "Cover", default: null },
      {
        type: "images",
        id: "gallery",
        label: "Gallery",
        default: [],
        minItems: 0,
        maxItems: 6,
      },
      { type: "audio", id: "soundtrack", label: "Soundtrack", default: null },
      {
        type: "audios",
        id: "episodes",
        label: "Episodes",
        default: [],
        maxItems: 12,
      },
      { type: "video", id: "trailer", label: "Trailer", default: null },
      {
        type: "videos",
        id: "clips",
        label: "Clips",
        default: [],
        minItems: 0,
        maxItems: 4,
      },
    ],
  });
  assert.deepEqual(
    section.settings.map((field) => field.type),
    ["image", "images", "audio", "audios", "video", "videos"],
  );
  assert.throws(
    () =>
      defineSection({
        label: "Invalid limits",
        groups: ["content"],
        messages: {},
        settings: [
          {
            type: "images",
            id: "gallery",
            label: "Gallery",
            default: [],
            minItems: 2,
            maxItems: 1,
          },
        ],
      }),
    /minItems exceeds maxItems/,
  );
  assert.throws(
    () =>
      defineSection({
        label: "Invalid default",
        groups: ["content"],
        messages: {},
        settings: [
          {
            type: "videos",
            id: "clips",
            label: "Clips",
            default: [],
            minItems: 1,
          },
        ],
      }),
    /default violates item limits/,
  );
  assert.throws(
    () =>
      defineSection({
        label: "Invalid forms default",
        groups: ["content"],
        messages: {},
        settings: [
          {
            type: "forms",
            id: "surveys",
            label: "Surveys",
            default: [],
            minItems: 1,
          },
        ],
      }),
    /default violates item limits/,
  );
});

test("heading is a structured localized property with text filters but no sorting", () => {
  const properties = defineSiteManifestProperties([
    {
      key: "title",
      label: "Title",
      type: "heading",
      locale: true,
    },
    { key: "body", label: "Body", type: "rich" },
    { key: "gallery", label: "Gallery", type: "images" },
  ]);
  assert.deepEqual(
    properties.map((property) => property.type),
    ["heading", "rich", "images"],
  );
  assert.throws(
    () =>
      defineSiteManifestProperties([
        { key: "title", label: "Title", type: "heading", sortable: true },
      ]),
    /cannot be sortable/,
  );
  const section = defineSection({
    label: "Heading",
    groups: ["content"],
    messages: {},
    settings: [
      {
        type: "heading",
        id: "title",
        label: "Title",
        locale: true,
        default: { level: 2, value: "Overview" },
      },
    ],
  });
  assert.deepEqual(section.settings[0]?.default, {
    level: 2,
    value: "Overview",
  });
  assert.throws(
    () =>
      defineSection({
        label: "Invalid heading",
        groups: ["content"],
        messages: {},
        settings: [
          {
            type: "heading",
            id: "title",
            label: "Title",
            default: { level: 7, value: "Invalid" },
          },
        ],
      }),
    /Invalid heading setting level/,
  );
});

test("switch is filterable", () => {
  const properties = defineSiteManifestProperties([
    { key: "enabled", label: "Enabled", type: "switch" },
    {
      key: "live",
      label: "Live",
      type: "switch",
      filterable: { operators: ["equals"] },
    },
  ]);
  assert.deepEqual(queryOperatorsForProperty(properties[0]!), ["equals", "not"]);
  assert.deepEqual(queryOperatorsForProperty(properties[1]!), ["equals"]);
});

test("form properties are filterable by id and forms collections are not sortable", () => {
  const properties = defineSiteManifestProperties([
    { key: "survey", label: "Survey", type: "form" },
    {
      key: "surveys",
      label: "Surveys",
      type: "forms",
      filterable: { operators: ["contains"] },
    },
  ]);
  assert.deepEqual(queryOperatorsForProperty(properties[0]!), [
    "equals",
    "not",
    "in",
    "notIn",
  ]);
  assert.deepEqual(queryOperatorsForProperty(properties[1]!), ["contains"]);
  assert.throws(
    () =>
      defineSiteManifestProperties([
        { key: "surveys", label: "Surveys", type: "forms", sortable: true },
      ]),
    /cannot be sortable/,
  );
});
