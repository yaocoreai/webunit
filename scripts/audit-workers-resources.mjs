import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const path = resolve(process.cwd(), process.argv[2] || "wrangler.jsonc");
const config = JSON.parse((await readFile(path, "utf8")).replace(/^\s*\/\/.*$/gm, ""));
assert.equal(config.d1_databases?.length, 1, "Workers requires exactly one D1 binding");
assert.equal(config.d1_databases[0].binding, "DB");
assert.ok(config.d1_databases[0].database_id, "D1 database ID is missing");
assert.equal(config.r2_buckets?.length, 1, "Workers requires exactly one R2 binding");
assert.equal(config.r2_buckets[0].binding, "STORAGE");
assert.ok(config.r2_buckets[0].bucket_name, "R2 bucket name is missing");
const kvBindings = config.kv_namespaces?.map((entry) => entry.binding).sort();
assert.deepEqual(kvBindings, ["FUNCTION_CACHE", "SESSION", "WEB_CACHE"], "Workers requires independent Functions Cache, Astro SSR Cache, and Astro-managed Session KV bindings");
assert.ok(config.kv_namespaces.find((entry) => entry.binding === "FUNCTION_CACHE")?.id, "FUNCTION_CACHE KV namespace ID is missing");
assert.ok(config.kv_namespaces.find((entry) => entry.binding === "WEB_CACHE")?.id, "WEB_CACHE KV namespace ID is missing");
assert.ok(config.kv_namespaces.find((entry) => entry.binding === "SESSION")?.id, "SESSION KV namespace ID is missing");
assert.equal(config.queues, undefined, "Workers must not provision Queue bindings");
assert.equal(config.triggers?.crons, undefined, "Workers must not provision schedule triggers");
assert.equal(config.analytics_engine_datasets, undefined, "Workers must not provision Analytics Engine datasets");
const durableObjectNames = config.durable_objects?.bindings?.map((entry) => entry.name).sort();
assert.deepEqual(durableObjectNames, ["RATE_LIMIT"], "Workers requires exactly the Rate Limit Durable Object");
if (process.env.ALLOW_PLACEHOLDER_RESOURCES !== "true") {
  const serialized = JSON.stringify(config);
  assert.ok(!serialized.includes("replace-with-"), "Workers config contains placeholder resource IDs");
}
console.info("[workers:resources:audit] status=completed");
