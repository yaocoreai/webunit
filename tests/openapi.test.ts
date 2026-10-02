import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { functionHttpRoutes } from "@/function/bootstrap/generated/route/manifest";

test("Function OpenAPI is generated from the single HTTP Route manifest", async () => {
  const document = JSON.parse(
    await readFile(
      new URL("../src/platform/generated/function-openapi.json", import.meta.url),
      "utf8",
    ),
  ) as {
    paths: Record<string, Record<string, { "x-route-name"?: string }>>;
  };
  const operations = Object.entries(document.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({
      path,
      method: method.toUpperCase(),
      name: operation["x-route-name"],
    })),
  );
  assert.equal(operations.length, functionHttpRoutes.length);
  for (const route of functionHttpRoutes) {
    assert.ok(
      operations.some(
        (operation) =>
          operation.name === route.name && operation.method === route.method,
      ),
      `${route.method} ${route.path}`,
    );
  }
  assert.equal(
    document.paths["/_/public/storage/read/{wildcard}"]?.get?.[
      "x-route-name"
    ],
    "public.storage.read.signed",
  );
});
