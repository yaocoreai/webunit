import assert from "node:assert/strict";
import test from "node:test";
import {
  data,
  defineCommand,
  defineRoute,
  lazyOperation,
  lazyRouteMiddleware,
} from "@/function/common/route/definition";
import { createRouteRegistry } from "@/function/common/route/registry";
import {
  createLazyRouteRegistry,
  defineRouteModule,
  defineRouteModules,
} from "@/function/common/route/module";
import { createRouteDispatcher } from "@/function/common/route/dispatcher";
import { createTestFunctionHttpGateway } from "./support/function-http";
import { routeNameToHttpPath } from "@/platform/function/http/path";
import { lazyOperations } from "@/function/common/route/operation-module";
import {
  defineRouteContract,
  validationFailed,
} from "@/function/common/app/operation";
import { s } from "@/function/common/app/schema";

const testContract = defineRouteContract({
  input: s.unknown(),
  output: s.unknown(),
  errors: [validationFailed],
});

const scope = {
  platform: { deployment: "node", mode: "test" } as const,
  capabilities: {},
  configuration: { allowedOrigins: [] },
  secrets: {},
  effects: {
    defer: () => undefined,
    purgeResponseCache: async () => undefined,
  },
} as never;

test("Route uses one globally unique surface-qualified name and fixed spec lookup", () => {
  const thirdPartySpec = Object.freeze({ kind: "vendor-audit", enabled: true });
  const route = defineRoute("public.cms.content.query", {
    contract: testContract,
    specs: [{ kind: "validation" }, thirdPartySpec],
    operation: defineCommand({
      execute: async (_context, input) => data(input),
    }),
  });
  assert.equal(route.surface, "public");
  assert.equal(route.getSpec("vendor-audit"), thirdPartySpec);
  assert.equal(route.getSpec("missing"), undefined);
  assert.throws(
    () => createRouteRegistry([route, route]),
    /Duplicate Route name/,
  );
  assert.throws(
    () =>
      defineRoute("cms.content.query", {
        contract: testContract,
        operation: route.operation,
      }),
    /Invalid Route name/,
  );
  assert.throws(
    () =>
      defineRoute("public.cms.content.read", {
        contract: testContract,
        specs: [{ kind: "cache" }, { kind: "cache" }],
        operation: route.operation,
      }),
    /Duplicate Route spec kind/,
  );
});

test("Direct and HTTP transports execute the same ordered middleware and Operation", async () => {
  const calls: string[] = [];
  const route = defineRoute("public.cms.content.query", {
    contract: testContract,
    middleware: [
      async (_context, input, next) => {
        calls.push("before");
        const result = await next({ ...(input as object), first: true });
        calls.push("after");
        return result;
      },
      "validation",
    ],
    operation: defineCommand({
      execute: async (context, input) => {
        calls.push(context.transport);
        return data(input);
      },
    }),
  });
  const dispatcher = createRouteDispatcher({
    routes: createRouteRegistry([route]),
    middleware: new Map([
      [
        "validation",
        async (_context, input, next) => {
          calls.push("validation");
          return next(input);
        },
      ],
    ]),
  });
  assert.deepEqual(await dispatcher.invoke(route.name, { value: 1 }, scope), {
    type: "data",
    data: { value: 1, first: true },
  });
  const gateway = createTestFunctionHttpGateway(scope, {
    routes: [route],
    dispatcher,
  });
  const response = await gateway(
    new Request(`https://example.com${routeNameToHttpPath(route.name)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: 2 }),
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { value: 2, first: true } });
  assert.deepEqual(calls, [
    "before",
    "validation",
    "direct",
    "after",
    "before",
    "validation",
    "http",
    "after",
  ]);
});

test("nested Direct routes share request state and request id but isolate route state", async () => {
  const child = defineRoute("internal.cms.content.child", {
    contract: testContract,
    operation: defineCommand({
      execute: async (context) => {
        assert.equal(context.requestId, "request-shared");
        assert.equal(context.requestState.get("shared"), 1);
        assert.equal(context.state.has("route-only"), false);
        context.requestState.set("shared", 2);
        context.state.set("child-only", true);
        return data({ ok: true });
      },
    }),
  });
  const parent = defineRoute("public.cms.content.parent", {
    contract: testContract,
    operation: defineCommand({
      execute: async (context) => {
        context.requestState.set("shared", 1);
        context.state.set("route-only", true);
        await context.invoke(child.name, {});
        assert.equal(context.requestState.get("shared"), 2);
        assert.equal(context.state.has("child-only"), false);
        return data({ ok: true });
      },
    }),
  });
  const dispatcher = createRouteDispatcher({
    routes: createRouteRegistry([parent, child]),
  });
  await dispatcher.invoke(parent.name, {}, scope, {
    requestId: "request-shared",
    requestState: new Map(),
  });
});

test("Route execution logs remain transport-neutral for Direct and HTTP dispatch", async () => {
  const route = defineRoute("public.runtime.health.read", {
    contract: testContract,
    operation: defineCommand({ execute: async () => data({ ok: true }) }),
  });
  const logs: import("@/function/common/route/dispatcher").RouteExecutionLog[] =
    [];
  const dispatcher = createRouteDispatcher({
    routes: createRouteRegistry([route]),
    log: (entry) => logs.push(entry),
  });
  await dispatcher.invoke(route.name, {}, scope);
  await createTestFunctionHttpGateway(scope, {
    routes: [route],
    dispatcher,
  })(
    new Request("https://example.com/_/public/runtime/health/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  assert.equal(logs[0]?.route, route.name);
  assert.equal(logs[0]?.transport, "direct");
  assert.equal(logs[0]?.outcome, "completed");
  assert.equal(logs[0]?.correlationId, logs[0]?.requestId);
  assert.equal(logs[1]?.transport, "http");
  assert.equal(logs[1]?.outcome, "completed");
});

test("HTTP gateway exposes only POST non-internal Routes with canonical envelopes", async () => {
  const internal = defineRoute("internal.cms.search.rebuild", {
    contract: testContract,
    operation: defineCommand({ execute: async () => data({ ok: true }) }),
  });
  const publicRoute = defineRoute("public.cms.content.query", {
    contract: testContract,
    operation: defineCommand({ execute: async () => data({ ok: true }) }),
  });
  const dispatcher = createRouteDispatcher({
    routes: createRouteRegistry([internal, publicRoute]),
  });
  const gateway = createTestFunctionHttpGateway(scope, {
    routes: [internal, publicRoute],
    dispatcher,
  });
  assert.equal(
    (
      await gateway(
        new Request("https://example.com/_/internal/cms/search/rebuild", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await gateway(
        new Request("https://example.com/_/public/cms/content/query"),
      )
    ).status,
    405,
  );
  const missing = await gateway(
    new Request("https://example.com/_/public/cms/content/missing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: `{"value":"${"x".repeat(256 * 1024)}`,
    }),
  );
  assert.equal(missing.status, 404);
  assert.deepEqual(Object.keys(await missing.json()), ["error", "meta"]);
});

test("lazy Operation loads once on first invocation", async () => {
  let loads = 0;
  const route = defineRoute("public.runtime.health.read", {
    contract: testContract,
    operation: lazyOperation(async () => {
      loads += 1;
      return defineCommand({ execute: async () => data({ ok: true }) });
    }),
  });
  const dispatcher = createRouteDispatcher({
    routes: createRouteRegistry([route]),
  });
  assert.equal(loads, 0);
  await dispatcher.invoke(route.name, {}, scope);
  await dispatcher.invoke(route.name, {}, scope);
  assert.equal(loads, 1);
});

test("lazy Route middleware loads only on first use and retries a rejected load", async () => {
  let loads = 0;
  let fail = true;
  const middleware = lazyRouteMiddleware(async () => {
    loads += 1;
    if (fail) {
      fail = false;
      throw new Error("temporary middleware module failure");
    }
    return async (_context, input, next) => next(input);
  });
  const route = defineRoute("public.test.lazy-middleware.read", {
    contract: testContract,
    middleware: ["lazy"],
    operation: defineCommand({ execute: async () => data({ ok: true }) }),
  });
  const dispatcher = createRouteDispatcher({
    routes: createRouteRegistry([route]),
    middleware: new Map([["lazy", middleware]]),
  });
  assert.equal(loads, 0);
  await assert.rejects(
    () => dispatcher.invoke(route.name, {}, scope),
    /temporary middleware module failure/,
  );
  assert.equal(loads, 1);
  await dispatcher.invoke(route.name, {}, scope);
  await dispatcher.invoke(route.name, {}, scope);
  assert.equal(loads, 2);
});

test("lazy Operations share one owner load and retry after a rejected load", async () => {
  let loads = 0;
  let fail = true;
  const operations = lazyOperations(async () => {
    loads += 1;
    if (fail) {
      fail = false;
      throw new Error("temporary operation module failure");
    }
    return {
      read: defineCommand({ execute: async () => data({ ok: true }) }),
      ignored: "not-an-operation",
    };
  });
  const operation = operations("read");
  assert.equal(loads, 0);
  await Promise.all([
    assert.rejects(
      () => operation.execute({} as never, {}),
      /temporary operation module failure/,
    ),
    assert.rejects(
      () => operation.execute({} as never, {}),
      /temporary operation module failure/,
    ),
  ]);
  assert.equal(loads, 1);
  assert.deepEqual(
    await Promise.all([
      operation.execute({} as never, {}),
      operation.execute({} as never, {}),
    ]),
    [data({ ok: true }), data({ ok: true })],
  );
  assert.equal(loads, 2);
});

test("lazy Route Registry loads only the requested Feature Module and shares concurrent first load", async () => {
  let requestedLoads = 0;
  let unrelatedLoads = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = defineRoute("public.test.lazy.read", {
    contract: testContract,
    operation: defineCommand({ execute: async () => data("ok") }),
  });
  const unrelated = defineRoute("admin.test.unrelated.read", {
    contract: testContract,
    operation: defineCommand({ execute: async () => data("unused") }),
  });
  const modules = defineRouteModules([
    defineRouteModule("test.lazy", async () => {
      requestedLoads += 1;
      await gate;
      return { routes: [requested] };
    }),
    defineRouteModule("test.unrelated", async () => {
      unrelatedLoads += 1;
      return { routes: [unrelated] };
    }),
  ]);
  const dispatcher = createRouteDispatcher({
    routes: createLazyRouteRegistry(
      modules,
      new Set([
        "public.test.lazy.read",
        "admin.test.unrelated.read",
      ]),
    ),
  });
  const calls = [
    dispatcher.invoke(requested.name, {}, scope),
    dispatcher.invoke(requested.name, {}, scope),
  ];
  await Promise.resolve();
  assert.deepEqual([requestedLoads, unrelatedLoads], [1, 0]);
  release();
  assert.deepEqual(await Promise.all(calls), [data("ok"), data("ok")]);
  assert.deepEqual([requestedLoads, unrelatedLoads], [1, 0]);
});
