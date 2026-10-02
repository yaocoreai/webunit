import assert from "node:assert/strict";
import test from "node:test";
import { createTestFunctionHttpGateway } from "./support/function-http";
import { applicationError, ApplicationError } from "@/function/common/app/error";
import { defineErrorContract } from "@/function/common/app/error-contract";
import {
  defineDataQuery,
  defineRouteContract,
  validationFailed,
} from "@/function/common/app/operation";
import { s } from "@/function/common/app/schema";
import { defineRoute } from "@/function/common/route/definition";
import { createRouteDispatcher } from "@/function/common/route/dispatcher";
import { createRouteRegistry } from "@/function/common/route/registry";

const inputSchema = s.object({
  name: s.string().trim().min(1),
  enabled: s.boolean().default(true),
});

const outputSchema = s.object({ greeting: s.string().min(1) });

const unavailable = defineErrorContract({
  code: "greeting_unavailable",
  kind: "unavailable",
  exposure: "public",
  message: "Greeting is temporarily unavailable",
});

const contract = defineRouteContract({
  input: inputSchema,
  output: outputSchema,
  errors: [validationFailed, unavailable],
  validateOutput: true,
});

const scope = {
  platform: { deployment: "node", mode: "test" },
  capabilities: {},
  configuration: { allowedOrigins: [] },
  secrets: {},
} as never;

test("Value Schema validates, normalizes, defaults, and reports structured issues", () => {
  assert.deepEqual(inputSchema.safeParse({ name: "  Ada  " }), {
    success: true,
    data: { name: "Ada", enabled: true },
  });
  const invalid = inputSchema.safeParse({ name: "", unknown: true });
  assert.equal(invalid.success, false);
  if (!invalid.success) {
    assert.deepEqual(
      invalid.issues.map(({ path, code }) => ({ path, code })),
      [
        { path: ["name"], code: "too_short" },
        { path: ["unknown"], code: "unknown_field" },
      ],
    );
  }
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  const bounded = s.object({}).passthrough().maxSerializedBytes(1_024)
    .safeParse(cyclic);
  assert.equal(bounded.success, false);
  if (!bounded.success) assert.equal(bounded.issues[0]?.code, "invalid_value");
});

test("Operation boundary always validates input and follows the output policy", async () => {
  let executions = 0;
  const operation = defineDataQuery({
    contract,
    execute: async (_context, input) => {
      executions += 1;
      return { greeting: `Hello ${input.name}` };
    },
  });
  assert.deepEqual(await operation.execute({} as never, { name: " Ada " }), {
    type: "data",
    data: { greeting: "Hello Ada" },
  });
  await assert.rejects(
    () => operation.execute({} as never, { name: "" }),
    (error: unknown) =>
      error instanceof ApplicationError &&
      error.code === "validation_failed" &&
      error.kind === "invalid_argument",
  );
  assert.equal(executions, 1);

  const invalidOutput = defineDataQuery({
    contract,
    execute: async () => ({ greeting: "" }),
  });
  await assert.rejects(
    () => invalidOutput.execute({} as never, { name: "Ada" }),
    (error: unknown) =>
      error instanceof ApplicationError &&
      error.code === "internal_error" &&
      error.kind === "internal",
  );

  const uncheckedOutput = defineDataQuery({
    contract: defineRouteContract({
      input: inputSchema,
      output: outputSchema,
      errors: [validationFailed],
    }),
    execute: async () => ({ greeting: "" }),
  });
  assert.deepEqual(
    await uncheckedOutput.execute({} as never, { name: "Ada" }),
    { type: "data", data: { greeting: "" } },
  );
});

test("Operation exposes only declared mapped Application Errors", async () => {
  class GreetingBackendError extends Error {}
  const mapped = defineDataQuery({
    contract,
    mapError: (error) =>
      error instanceof GreetingBackendError
        ? applicationError(unavailable, { cause: error })
        : undefined,
    execute: async () => {
      throw new GreetingBackendError("offline");
    },
  });
  await assert.rejects(
    () => mapped.execute({} as never, { name: "Ada" }),
    (error: unknown) =>
      error instanceof ApplicationError &&
      error.code === "greeting_unavailable",
  );

  const undeclared = defineDataQuery({
    contract,
    execute: async () => {
      throw applicationError(
        defineErrorContract({
          code: "undeclared_error",
          kind: "conflict",
          exposure: "public",
          message: "Undeclared",
        }),
      );
    },
  });
  await assert.rejects(
    () => undeclared.execute({} as never, { name: "Ada" }),
    (error: unknown) =>
      error instanceof ApplicationError && error.code === "internal_error",
  );
});

test("Function HTTP adapter emits canonical Application Error envelopes", async () => {
  const route = defineRoute("public.test.contract.read", {
    contract,
    operation: defineDataQuery({
      contract,
      execute: async (_context, input) => ({ greeting: `Hello ${input.name}` }),
    }),
  });
  const dispatcher = createRouteDispatcher({
    routes: createRouteRegistry([route]),
  });
  const gateway = createTestFunctionHttpGateway(scope, {
    routes: [route],
    dispatcher,
  });
  const response = await gateway(
    new Request("https://example.com/_/public/test/contract/read", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "<unsafe>",
      },
      body: JSON.stringify({ name: "" }),
    }),
  );
  assert.equal(response.status, 422);
  const body = (await response.json()) as {
    error: { code: string; details: { issues: unknown[] } };
    meta: { requestId: string };
  };
  assert.equal(body.error.code, "validation_failed");
  assert.equal(body.error.details.issues.length, 1);
  assert.notEqual(body.meta.requestId, "<unsafe>");
  assert.equal(response.headers.get("x-request-id"), body.meta.requestId);
});

test("Function CORS exposes only generic Function transport headers", async () => {
  const route = defineRoute("public.test.cors.read", {
    contract,
    operation: defineDataQuery({
      contract,
      execute: async (_context, input) => ({ greeting: `Hello ${input.name}` }),
    }),
  });
  const dispatcher = createRouteDispatcher({
    routes: createRouteRegistry([route]),
  });
  const gateway = createTestFunctionHttpGateway(
    {
      ...scope,
      configuration: {
        allowedOrigins: ["https://admin.example"],
      },
    } as never,
    { routes: [route], dispatcher },
  );
  const response = await gateway(
    new Request("https://site.example/_/public/test/cors/read", {
      method: "OPTIONS",
      headers: { origin: "https://admin.example" },
    }),
  );

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-headers"),
    "Authorization, Content-Type, Accept, X-Request-Id",
  );
  assert.equal(
    response.headers.get("access-control-expose-headers"),
    "X-Request-Id",
  );
});
