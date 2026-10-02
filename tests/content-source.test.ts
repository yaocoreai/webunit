import assert from "node:assert/strict";
import test from "node:test";
import { createBrowserContent } from "@/platform/theme/content/browser";
import {
  isPublicContentUrl,
  isTrustedCmsAssetEmbedUrl,
} from "@/platform/theme/content/url";
import { createMemoryReadModel } from "@/platform/theme/content/model";
import { createDatasPublicContent } from "@/platform/theme/datas/content-api";
import { createDatasContentSource } from "@/platform/theme/datas/source";
import { ApiError } from "@/platform/runtime/error";
import {
  assertBrowserContentQuery,
  executeContentQuery,
  readContentQueryRequest,
} from "@/platform/theme/content/protocol";
import { createPublicContentApiFromQuery } from "@/platform/theme/content/public-content";
import type { ArticleEntry } from "@/theme/types";
import theme from "@/manifest";
import { createTestFunctionHttpGateway } from "./support/function-http";
import { createRouteDispatcher } from "@/function/common/route/dispatcher";
import { createRouteRegistry } from "@/function/common/route/registry";
import { defineRoute } from "@/function/common/route/definition";
import { applicationError } from "@/function/common/app/error";
import { defineErrorContract } from "@/function/common/app/error-contract";
import {
  defineDataQuery,
  defineRouteContract,
  validationFailed,
} from "@/function/common/app/operation";
import { s } from "@/function/common/app/schema";

const invalidContentQuery = defineErrorContract({
  code: "invalid_content_query",
  kind: "invalid_argument",
  exposure: "public",
  message: "Invalid content query",
});
const browserQueryContract = defineRouteContract({
  input: s.object({
    context: s.object({
      host: s.string().min(1),
      locale: s.string().min(1),
    }),
    query: s.unknown(),
  }),
  output: s.unknown(),
  errors: [validationFailed, invalidContentQuery],
});

const browserQueryRoute = defineRoute("public.cms.content.query", {
  contract: browserQueryContract,
  operation: defineDataQuery({
    contract: browserQueryContract,
    mapError: (error) =>
      applicationError(invalidContentQuery, { cause: error }),
    async execute(context, input) {
      const query = readContentQueryRequest(input.query);
      assertBrowserContentQuery(query, theme.modules ?? []);
      const content = createDatasPublicContent(
        {
          domainHost: input.context.host,
          locale: input.context.locale,
          signal: context.signal,
        },
        theme.modules ?? [],
      );
      return executeContentQuery(content, query);
    },
  }),
});
const browserQueryDispatcher = createRouteDispatcher({
  routes: createRouteRegistry([browserQueryRoute]),
});
const browserQueryScope = {
  platform: { deployment: "node", mode: "test" } as const,
  capabilities: {},
  configuration: { allowedOrigins: [] },
  secrets: {},
  effects: {
    defer: () => undefined,
    purgeResponseCache: async () => undefined,
  },
} as never;
const browserQueryGateway = createTestFunctionHttpGateway(browserQueryScope, {
  routes: [browserQueryRoute],
  dispatcher: browserQueryDispatcher,
});
const queryRoute = ({ request }: { request: Request }) =>
  browserQueryGateway(request);
const queryEnvelope = (query: unknown) => ({
  context: { host: "northstar.local", locale: "en-us" },
  query,
});
const createServicePublicContentApi = (
  client: { request(): Promise<{ data: unknown }> },
  context: Parameters<typeof createPublicContentApiFromQuery>[1],
) => createPublicContentApiFromQuery(() => client.request(), context);

test("Function CmsAsset decoding preserves alternative text", async () => {
  const content = createServicePublicContentApi(
    {
      request: async () => ({
        data: {
          id: "asset-id",
          type: "image",
          title: "Editorial image",
          alt: "Editorial studio",
          delivery: {
            type: "file",
            url: "https://cdn.example.com/editorial.webp",
            contentType: "image/webp",
          },
        },
      }),
    } as never,
    {
      domainHost: "example.com",
      locale: "en",
      signal: new AbortController().signal,
    },
  );
  assert.equal((await content.asset("asset-id"))?.alt, "Editorial studio");

  const invalidVideoAltContent = createServicePublicContentApi(
    {
      request: async () => ({
        data: {
          id: "video-id",
          type: "video",
          title: "Editorial video",
          alt: "Invalid video alt",
          delivery: {
            type: "embed",
            provider: "youtube",
            url: "https://www.youtube-nocookie.com/embed/video-id",
          },
        },
      }),
    } as never,
    {
      domainHost: "example.com",
      locale: "en",
      signal: new AbortController().signal,
    },
  );
  await assert.rejects(
    () => invalidVideoAltContent.asset("video-id"),
    (error) => error instanceof ApiError && error.status === 502,
  );

  const invalidPosterContent = createServicePublicContentApi(
    {
      request: async () => ({
        data: {
          id: "invalid-poster",
          type: "image",
          title: "Invalid poster owner",
          poster: { url: "https://cdn.example.com/poster.webp" },
          delivery: { type: "file", url: "https://cdn.example.com/image.webp" },
        },
      }),
    } as never,
    {
      domainHost: "example.com",
      locale: "en",
      signal: new AbortController().signal,
    },
  );
  await assert.rejects(
    () => invalidPosterContent.asset("invalid-poster"),
    (error) => error instanceof ApiError && error.status === 502,
  );

  const invalidEmbedTypeContent = createServicePublicContentApi(
    {
      request: async () => ({
        data: {
          id: "invalid-embed-type",
          type: "image",
          title: "Invalid embed type",
          delivery: {
            type: "embed",
            provider: "youtube",
            url: "https://www.youtube-nocookie.com/embed/video-id",
          },
        },
      }),
    } as never,
    {
      domainHost: "example.com",
      locale: "en",
      signal: new AbortController().signal,
    },
  );
  await assert.rejects(
    () => invalidEmbedTypeContent.asset("invalid-embed-type"),
    (error) => error instanceof ApiError && error.status === 502,
  );

  const invalidEmbedProviderTypeContent = createServicePublicContentApi(
    {
      request: async () => ({
        data: {
          id: "invalid-provider-type",
          type: "audio",
          title: "Invalid provider type",
          delivery: {
            type: "embed",
            provider: "youtube",
            url: "https://www.youtube-nocookie.com/embed/video-id",
          },
        },
      }),
    } as never,
    {
      domainHost: "example.com",
      locale: "en",
      signal: new AbortController().signal,
    },
  );
  await assert.rejects(
    () => invalidEmbedProviderTypeContent.asset("invalid-provider-type"),
    (error) => error instanceof ApiError && error.status === 502,
  );

  const incompleteDimensionsContent = createServicePublicContentApi(
    {
      request: async () => ({
        data: {
          id: "invalid-dimensions",
          type: "image",
          title: "Invalid dimensions",
          width: 1200,
          delivery: { type: "file", url: "https://cdn.example.com/image.webp" },
        },
      }),
    } as never,
    {
      domainHost: "example.com",
      locale: "en",
      signal: new AbortController().signal,
    },
  );
  await assert.rejects(
    () => incompleteDimensionsContent.asset("invalid-dimensions"),
    (error) => error instanceof ApiError && error.status === 502,
  );
});

test("public content URLs reject protocol-relative escapes and credentials", async () => {
  assert.equal(isPublicContentUrl("/media/editorial.webp"), true);
  assert.equal(
    isPublicContentUrl("https://cdn.example.com/editorial.webp"),
    true,
  );
  assert.equal(isPublicContentUrl("//evil.example/editorial.webp"), false);
  assert.equal(isPublicContentUrl("/\\evil.example/editorial.webp"), false);
  assert.equal(
    isPublicContentUrl("https://user:secret@cdn.example.com/editorial.webp"),
    false,
  );
  assert.equal(
    isTrustedCmsAssetEmbedUrl(
      "youtube",
      "https://www.youtube-nocookie.com/embed/video-id",
    ),
    true,
  );
  assert.equal(
    isTrustedCmsAssetEmbedUrl("youtube", "https://evil.example/embed/video-id"),
    false,
  );
  assert.equal(
    isTrustedCmsAssetEmbedUrl(
      "youtube",
      "https://www.youtube-nocookie.com/redirect?url=https://evil.example",
    ),
    false,
  );
  assert.equal(
    isTrustedCmsAssetEmbedUrl("vimeo", "https://player.vimeo.com:444/video/1"),
    false,
  );

  const assetContent = createServicePublicContentApi(
    {
      request: async () => ({
        data: {
          id: "asset-id",
          type: "image",
          title: "Unsafe image",
          delivery: { type: "file", url: "//evil.example/editorial.webp" },
        },
      }),
    } as never,
    {
      domainHost: "example.com",
      locale: "en",
      signal: new AbortController().signal,
    },
  );
  await assert.rejects(
    () => assetContent.asset("asset-id"),
    (error) => error instanceof ApiError && error.status === 502,
  );

  const embedContent = createServicePublicContentApi(
    {
      request: async () => ({
        data: {
          id: "video-id",
          type: "video",
          title: "Unsafe video",
          delivery: {
            type: "embed",
            provider: "youtube",
            url: "https://evil.example/embed/video-id",
          },
        },
      }),
    } as never,
    {
      domainHost: "example.com",
      locale: "en",
      signal: new AbortController().signal,
    },
  );
  await assert.rejects(
    () => embedContent.asset("video-id"),
    (error) => error instanceof ApiError && error.status === 502,
  );

  const menuContent = createServicePublicContentApi(
    {
      request: async () => ({
        data: {
          id: "menu-id",
          items: [
            {
              id: "item-id",
              fields: {},
              link: {
                type: "path",
                title: "Unsafe link",
                target: "_self",
                href: "/\\evil.example/path",
                resource: null,
              },
              children: [],
            },
          ],
        },
      }),
    } as never,
    {
      domainHost: "example.com",
      locale: "en",
      signal: new AbortController().signal,
    },
  );
  await assert.rejects(
    () => menuContent.menu("menu-id"),
    (error) => error instanceof ApiError && error.status === 502,
  );

  const duplicateMenuContent = createServicePublicContentApi(
    {
      request: async () => ({
        data: {
          id: "menu-id",
          items: [
            {
              id: "duplicate",
              fields: {},
              link: {
                type: "path",
                title: "First",
                target: "_self",
                href: "/",
                resource: null,
              },
              children: [],
            },
            {
              id: "duplicate",
              fields: {},
              link: {
                type: "path",
                title: "Second",
                target: "_self",
                href: "/second",
                resource: null,
              },
              children: [],
            },
          ],
        },
      }),
    } as never,
    {
      domainHost: "example.com",
      locale: "en",
      signal: new AbortController().signal,
    },
  );
  await assert.rejects(
    () => duplicateMenuContent.menu("menu-id"),
    (error) => error instanceof ApiError && error.status === 502,
  );
});

test("Datas Error uses Theme message defaults with normal locale translation overrides", async () => {
  const request = new Request("https://www.northstar.cn/zh-cn/missing");
  const source = createDatasContentSource(theme, {
    request,
    url: new URL(request.url),
    requestId: "error-locale",
    signal: request.signal,
    locale: "zh-cn",
    signals: {} as never,
    dependency: () => {},
  });
  const result = await source.site.resolveError({
    host: "www.northstar.cn",
    origin: "https://www.northstar.cn",
    path: "/zh-cn/missing",
    query: "",
    status: 404,
    signal: request.signal,
  });
  assert.match(result.template.messages["code.404"], /\p{Script=Han}/u);
  assert.match(result.template.messages["code.500"], /\p{Script=Han}/u);
});

test("Datas filters structured fields with the same semantic values as Function EAV", async () => {
  const model = createMemoryReadModel([
    {
      id: "entry",
      fields: {
        heading: { level: 2, value: "Featured Product" },
        body: [
          {
            id: "paragraph",
            type: "paragraph",
            children: [
              { id: "text", type: "text", text: "Durable everyday design" },
            ],
          },
        ],
        gallery: [{ id: "asset-cover", type: "image" }],
        cover: { id: "asset-cover", type: "image" },
        category: { id: "category-1", reference: "module.category" },
      },
    },
  ]);
  assert.equal(
    (
      await model.findMany({
        where: { fields: { heading: { contains: "FEATURED" } } },
      })
    ).items.length,
    1,
  );
  assert.equal(
    (
      await model.findMany({
        where: { fields: { body: { contains: "EVERYDAY" } } },
      })
    ).items.length,
    1,
  );
  assert.equal(
    (
      await model.findMany({
        where: { fields: { gallery: { contains: "asset-cover" } } },
      })
    ).items.length,
    1,
  );
  assert.equal(
    (
      await model.findMany({
        where: { fields: { cover: { equals: "asset-cover" } } },
      })
    ).items.length,
    1,
  );
  assert.equal(
    (
      await model.findMany({
        where: { fields: { category: { equals: "category-1" } } },
      })
    ).items.length,
    1,
  );
  assert.equal(
    (
      await model.findMany({
        where: { fields: { cover: { equals: "missing" } } },
      })
    ).items.length,
    0,
  );
});

test("same-origin AJAX client exposes Storage, Modules and CmsMenu through the public content contract", async () => {
  const browser = createBrowserContent({
    locale: "en-us",
    host: "northstar.local",
    fetch: async (input, init) => {
      const request = new Request(
        new URL(String(input), "https://northstar.local"),
        init,
      );
      return await queryRoute({ request, url: new URL(request.url) } as never);
    },
  });
  const page = await browser.module<ArticleEntry>("article").findMany({
    query: "materials",
    limit: 1,
    includeTotal: true,
  });
  assert.equal(page.items.length, 1);
  assert.equal(page.total, 1);
  assert.equal(page.pageInfo.hasNextPage, false);
  const [assets, menus] = await Promise.all([
    browser.asset(["studio-cover", "missing-file"]),
    browser.menu([
      "40000000-0000-4000-8000-000000000001",
      "40000000-0000-4000-8000-000000000099",
    ]),
  ]);
  assert.equal(assets[0]?.id, "studio-cover");
  assert.equal(assets[1], null);
  const menu = menus[0];
  assert.equal(menu?.id, "40000000-0000-4000-8000-000000000001");
  assert.equal(
    menu?.items.find((item) => item.id === "articles")?.children[0]?.link.href,
    "/article/materials-guide",
  );
  assert.equal(menus[1], null);
});

test("Datas search uses the current Module SearchDocument", async () => {
  const signal = new AbortController().signal;
  const english = createDatasPublicContent(
    { domainHost: "northstar.local", locale: "en-us", signal },
    theme.modules ?? [],
  );
  assert.equal(
    (
      await english
        .module<ArticleEntry>("article")
        .findMany({ query: "materials" })
    ).items[0]?.id,
    "materials-guide",
  );
  assert.equal(
    (
      await english
        .module<ArticleEntry>("article")
        .findMany({ query: "missing phrase" })
    ).items.length,
    0,
  );
  assert.ok(
    (
      await english
        .module<ArticleEntry>("article")
        .findMany({ query: "ＭＡＴＥＲＩＡＬＳ" })
    ).items.length > 0,
  );
  assert.equal(
    (
      await english.module<ArticleEntry>("article").findMany({
        where: { fields: { description: { contains: "practical" } } },
      })
    ).items[0]?.id,
    "materials-guide",
  );
});

test("AJAX query rejects unbounded or unsafe operations", async () => {
  const request = new Request(
    "https://northstar.local/_/public/cms/content/query",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        queryEnvelope({
          target: { type: "module", key: "article" },
          operation: "deleteMany",
          input: {},
        }),
      ),
    },
  );
  const response = await queryRoute({
    request,
    url: new URL(request.url),
  } as never);
  assert.equal(response.status, 422);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const lookalikeRequest = new Request(
    "https://northstar.local/_/public/cms/content/query",
    {
      method: "POST",
      headers: { "content-type": "application/jsonp" },
      body: "{}",
    },
  );
  assert.equal(
    (
      await queryRoute({
        request: lookalikeRequest,
        url: new URL(lookalikeRequest.url),
      } as never)
    ).status,
    415,
  );

  const validRequest = new Request(
    "https://northstar.local/_/public/cms/content/query",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        queryEnvelope({
          target: { type: "module", key: "article" },
          operation: "findMany",
          input: { limit: 1 },
        }),
      ),
    },
  );
  const validResponse = await queryRoute({
    request: validRequest,
    url: new URL(validRequest.url),
  } as never);
  assert.equal(validResponse.status, 200);
  assert.match(
    validResponse.headers.get("x-request-id") ?? "",
    /^[0-9a-f-]{36}$/,
  );

  const browser = createBrowserContent({
    locale: "en-us",
    host: "northstar.local",
    fetch: async (input, init) => {
      const nextRequest = new Request(
        new URL(String(input), "https://northstar.local"),
        init,
      );
      return await queryRoute({
        request: nextRequest,
        url: new URL(nextRequest.url),
      } as never);
    },
  });
  await assert.rejects(
    () => browser.module("article").findMany({ limit: 101 }),
    /Invalid content query/,
  );
  await assert.rejects(
    () =>
      browser
        .module("article")
        .findMany({ where: { fields: { constructor: { equals: "unsafe" } } } }),
    /Invalid content query/,
  );
  await assert.rejects(
    () =>
      browser
        .module("article")
        .findMany({ where: { fields: { excerpt: { contains: "quiet" } } } }),
    /Invalid content query/,
  );
  await assert.rejects(
    () => browser.module("missing").count(),
    /Invalid content query/,
  );

  const invalidMenuRequest = new Request(
    "https://northstar.local/_/public/cms/content/query",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        queryEnvelope({
          target: { type: "menu" },
          operation: "get",
          input: { ids: "../main-menu" },
        }),
      ),
    },
  );
  assert.equal(
    (
      await queryRoute({
        request: invalidMenuRequest,
        url: new URL(invalidMenuRequest.url),
      } as never)
    ).status,
    422,
  );
});

test("AJAX can query any declared Theme Module", async () => {
  const browser = createBrowserContent({
    locale: "en-us",
    host: "northstar.local",
    fetch: async (input, init) => {
      const nextRequest = new Request(
        new URL(String(input), "https://northstar.local"),
        init,
      );
      return await queryRoute({
        request: nextRequest,
        url: new URL(nextRequest.url),
      } as never);
    },
  });
  const blog = await browser
    .module<ArticleEntry>("article")
    .findOne({ id: "materials-guide" });
  assert.equal(blog?.id, "materials-guide");
  assert.equal(
    (await browser.module("product").findMany({ limit: 1 })).items.length,
    1,
  );
  await assert.rejects(
    () => browser.module("missing").findMany({ limit: 1 }),
    /Invalid content query/,
  );
});

test("browser Content queries support pre-cancellation and bounded request time", async () => {
  const cancelledController = new AbortController();
  cancelledController.abort();
  let dispatched = false;
  const cancelled = createBrowserContent({
    signal: cancelledController.signal,
    fetch: async () => {
      dispatched = true;
      return Response.json({ data: null });
    },
  });
  await assert.rejects(
    () => cancelled.module("article").findMany(),
    /Content query cancelled/,
  );
  assert.equal(dispatched, false);

  const timed = createBrowserContent({
    timeoutMs: 5,
    fetch: async (_input, init) =>
      await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        );
      }),
  });
  await assert.rejects(
    () => timed.module("article").findMany(),
    /Content query timed out/,
  );

  const slowBody = createBrowserContent({
    timeoutMs: 5,
    fetch: async (_input, init) =>
      new Response(
        new ReadableStream({
          start(controller) {
            init?.signal?.addEventListener(
              "abort",
              () => controller.error(init.signal?.reason),
              { once: true },
            );
          },
        }),
        { headers: { "content-type": "application/json" } },
      ),
  });
  await assert.rejects(
    () => slowBody.module("article").findMany(),
    /Content query timed out/,
  );
});
