import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

const baseUrl = required("SMOKE_BASE_URL").replace(/\/$/, "");
const topology = process.env.SMOKE_TOPOLOGY?.trim() || "unknown";

const health = await expectFunction(
  "/_/public/runtime/health/read",
  200,
  {},
);
assert.equal(health.json?.data?.status, "ok");
assert.equal(health.json?.data?.service, "webunit-site");

// Config proves that a second namespace Module and its Database capability work
// without creating or mutating business data.
await expectFunctionError(
  "/_/public/config/record/read",
  404,
  "config_not_found",
  { namespace: "runtime-smoke", key: "read-only-missing-record" },
);

// A known Admin Route reaches authentication, while an unknown sibling is
// rejected by exact membership before any middleware or body parsing.
await expectFunctionError(
  "/_/admin/job/health/read",
  401,
  "unauthorized",
  {},
);
await expectRawFunctionError(
  "/_/admin/job/not-real",
  404,
  "route_not_found",
  invalidJsonBody(),
);

// Internal Routes are Direct-only and canonical path violations never resolve.
for (const path of [
  "/_/internal/cms/content/batch-query",
  "/_/public/runtime/not-real",
  "/_/public//runtime/health/read",
  "/_/Public/runtime/health/read",
  "/_/public/runtime_health/read",
  "/_/public/runtime/%2F/read",
  "/_/public/cms/%2E%2E/list",
]) {
  await expectFunctionError(path, 404, "route_not_found", {});
}

const metrics = await healthLoad();
console.info(JSON.stringify({
  event: "runtime_smoke_completed",
  topology,
  baseUrl,
  businessWrites: 0,
  siteLifecycle: false,
  ...metrics,
}));

async function expectFunction(path, statuses, input) {
  return expectResponse(path, statuses, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

async function expectFunctionError(path, status, code, input) {
  const result = await expectFunction(path, status, input);
  assert.equal(result.json?.error?.code, code, `${path} returned the wrong error`);
  return result;
}

async function expectRawFunctionError(path, status, code, body) {
  const result = await expectResponse(path, status, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  assert.equal(result.json?.error?.code, code, `${path} returned the wrong error`);
  return result;
}

async function expectResponse(path, statuses, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  assert.ok(
    (Array.isArray(statuses) ? statuses : [statuses]).includes(response.status),
    `${init?.method ?? "GET"} ${path}: ${response.status} ${text}`,
  );
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    /* Runtime Smoke only inspects JSON Function responses. */
  }
  return { response, text, json };
}

async function healthLoad() {
  const count = integer("SMOKE_REQUESTS", 100, 1, 10_000);
  const concurrency = integer("SMOKE_CONCURRENCY", 10, 1, 250);
  let cursor = 0;
  const durations = [];
  await Promise.all(
    Array.from({ length: Math.min(count, concurrency) }, async () => {
      while (true) {
        const index = cursor++;
        if (index >= count) return;
        const started = performance.now();
        await expectFunction("/_/public/runtime/health/read", 200, {});
        durations.push(performance.now() - started);
      }
    }),
  );
  durations.sort((left, right) => left - right);
  const p95Ms = durations[Math.ceil(durations.length * 0.95) - 1] ?? 0;
  const budget = Number(process.env.SMOKE_HEALTH_P95_MS ?? 1_000);
  assert.ok(p95Ms <= budget, `Health p95 ${p95Ms}ms exceeds ${budget}ms`);
  return {
    requests: count,
    concurrency,
    p95Ms: Math.round(p95Ms * 100) / 100,
  };
}

function invalidJsonBody() {
  const bytes = integer("SMOKE_UNKNOWN_BODY_BYTES", 256 * 1024, 1, 1024 * 1024);
  return `{"value":"${"x".repeat(bytes)}`;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function integer(name, fallback, min, max) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new Error(`${name} must be between ${min} and ${max}`);
  return value;
}
