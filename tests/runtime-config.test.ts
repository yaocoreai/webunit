import assert from "node:assert/strict";
import test from "node:test";
import {
  readAdminConfig,
  readContentTimeoutMs,
  readFunctionTimeoutMs,
} from "@/platform/runtime/runtime-config";
import {
  mergeServerEnvironment,
  readPlatformEnvironment,
  resolveServerEnvironment,
} from "@/platform/runtime/server-environment";
import { createEnv } from "@/platform/runtime/env";
import { cloudflareEnvironmentFile, loadPlatformEnvironment, platformEnvironmentDirectory } from "../scripts/environment.mjs";
import { cloudflareWranglerEnvironment, fillCloudflareConfig } from "../scripts/cloudflare-config.mjs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

test("root environment loads only the selected platform file and keeps shell values", async () => {
  const directory = await mkdtemp(join(tmpdir(), "webunit-site-env-"));
  try {
    await writeFile(
      join(directory, ".env.node"),
      "SITE_ORIGIN=https://node.example.com\n",
    );
    await writeFile(
      join(directory, ".env.cloudflare"),
      "SITE_ORIGIN=https://cloudflare.example.com\n",
    );
    const environment = { SITE_ORIGIN: "https://shell.example.com" };
    await loadPlatformEnvironment(
      "node",
      new URL(`file://${directory}/`),
      environment,
    );
    assert.deepEqual(environment, {
      SITE_ORIGIN: "https://shell.example.com",
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("cloudflare environment is read from source and ignores a parent .env.cloudflare", async () => {
  const parent = await mkdtemp(join(tmpdir(), "webunit-site-parent-env-"));
  try {
    await writeFile(
      join(parent, ".env.cloudflare"),
      "PARENT_ONLY_CLOUDFLARE=1\nSITE_ORIGIN=https://parent.example.com\n",
    );
    const environment = {};
    await loadPlatformEnvironment("cloudflare", pathToFileURL(`${parent}/`), environment);
    assert.equal(environment.PARENT_ONLY_CLOUDFLARE, undefined);
    const directory = fileURLToPath(platformEnvironmentDirectory("cloudflare", pathToFileURL(`${parent}/`)));
    assert.match(directory, /\/source\/?$/);
    assert.match(fileURLToPath(cloudflareEnvironmentFile), /\/source\/\.env\.cloudflare$/);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("cloudflare wrangler values come from the env file, not the committed skeleton", () => {
  const config = {
    main: "./src/platform/runtime/workers/entry.ts",
    vars: { SITE_ORIGIN: "https://should-not-survive.example.com", NODE_ENV: "development" },
    d1_databases: [{ binding: "DB", database_id: "replace-with-old", database_name: "old", remote: true }],
    r2_buckets: [{ binding: "STORAGE", bucket_name: "old", remote: true }],
    kv_namespaces: [
      { binding: "FUNCTION_CACHE", id: "old", remote: true },
      { binding: "WEB_CACHE", id: "old", remote: true },
      { binding: "SESSION", id: "old", remote: true },
    ],
  };
  const env = {
    CLOUDFLARE_ACCOUNT_ID: "account",
    NODE_ENV: "production",
    SITE_ORIGIN: "https://site.example.com",
    THEME_INTERFACE_KEY: "theme-key",
    FUNCTION_ORIGINS: "https://site.example.com,https://admin.example.com",
    STORAGE_ORIGIN: "https://storage.example.com",
    CLOUDFLARE_D1_DATABASE_ID: "d1",
    CLOUDFLARE_D1_DATABASE_NAME: "db",
    CLOUDFLARE_R2_BUCKET_NAME: "bucket",
    CLOUDFLARE_FUNCTION_CACHE_KV_NAMESPACE_ID: "fn",
    CLOUDFLARE_WEB_CACHE_KV_NAMESPACE_ID: "web",
    CLOUDFLARE_SESSION_KV_NAMESPACE_ID: "session",
  };
  fillCloudflareConfig(config, env, false);
  assert.equal(config.account_id, "account");
  assert.equal(config.vars.SITE_ORIGIN, "https://site.example.com");
  assert.equal(config.vars.NODE_ENV, "production");
  assert.equal(config.d1_databases[0].database_id, "d1");
  assert.equal(config.r2_buckets[0].bucket_name, "bucket");
  assert.equal(config.kv_namespaces.find((item) => item.binding === "SESSION").id, "session");
  assert.equal(JSON.stringify(config).includes("replace-with"), false);
  assert.equal(JSON.stringify(config).includes("should-not-survive"), false);
  assert.throws(() => fillCloudflareConfig(structuredClone(config), {}, false), /CLOUDFLARE_ACCOUNT_ID is required in source\/\.env\.cloudflare/);
  const fromFile = cloudflareWranglerEnvironment(
    { CLOUDFLARE_ACCOUNT_ID: "from-file", NODE_ENV: "development", SITE_ORIGIN: "https://file.example.com" },
    { CLOUDFLARE_ACCOUNT_ID: "from-shell", NODE_ENV: "production", SITE_ORIGIN: "https://shell.example.com" },
  );
  assert.equal(fromFile.CLOUDFLARE_ACCOUNT_ID, "from-file");
  assert.equal(fromFile.SITE_ORIGIN, "https://file.example.com");
  assert.equal(fromFile.NODE_ENV, "production");
});

test("env applies the shared empty, default, parse, and error rules", () => {
  const env = createEnv({ TEXT: " value ", EMPTY: " ", COUNT: "12" });
  assert.equal(env("TEXT", "fallback"), "value");
  assert.equal(env("EMPTY", "fallback"), "fallback");
  assert.equal(env("MISSING"), undefined);
  assert.equal(env("COUNT", 0, { parse: (value) => Number(value) }), 12);
  assert.equal(env("MISSING_COUNT", 7, { parse: (value) => Number(value) }), 7);
  assert.throws(
    () =>
      env("COUNT", 0, {
        parse: () => {
          throw new Error("must be numeric");
        },
      }),
    /COUNT.*must be numeric/,
  );
});

test("runtime config applies development defaults and normalizes origins", () => {
  assert.deepEqual(readAdminConfig({ DEV: true }), {
    origin: "http://localhost:3001",
  });
  assert.equal(readContentTimeoutMs({ DEV: false }), 15_000);
  assert.equal(
    readContentTimeoutMs({ DEV: false, CMS_CONTENT_TIMEOUT_MS: "500" }),
    500,
  );
  assert.equal(readFunctionTimeoutMs({ DEV: false }), 15_000);
  assert.equal(
    readFunctionTimeoutMs({ DEV: false, CMS_FUNCTION_TIMEOUT_MS: "500" }),
    500,
  );
});

test("runtime config rejects incomplete and invalid values", () => {
  assert.throws(
    () => readAdminConfig({ DEV: false }),
    /CMS_ADMIN_ORIGIN is required/,
  );
  assert.throws(
    () => readContentTimeoutMs({ DEV: false, CMS_CONTENT_TIMEOUT_MS: "60001" }),
    /CMS_CONTENT_TIMEOUT_MS/,
  );
  assert.throws(
    () => readFunctionTimeoutMs({ DEV: false, CMS_FUNCTION_TIMEOUT_MS: "99" }),
    /CMS_FUNCTION_TIMEOUT_MS/,
  );
});

test("runtime server bindings override embedded defaults without erasing them with empty values", () => {
  const databaseBinding = { prepare() {}, batch() {} };
  const cacheBinding = { get() {}, put() {}, delete() {} };
  assert.deepEqual(
    mergeServerEnvironment(
      {
        CMS_ADMIN_ORIGIN: "https://embedded.example.com",
        DEV: false,
      },
      {
        CMS_ADMIN_ORIGIN: "https://runtime.example.com",
        DEV: true,
        DB: databaseBinding,
        FUNCTION_CACHE: cacheBinding,
      },
    ),
    {
      CMS_ADMIN_ORIGIN: "https://runtime.example.com",
      DEV: true,
      DB: databaseBinding,
      FUNCTION_CACHE: cacheBinding,
    },
  );
  assert.equal(readPlatformEnvironment(), undefined);
  assert.deepEqual(
    readPlatformEnvironment({
      platformEnvironment: { CMS_ADMIN_ORIGIN: "https://runtime.example.com" },
    }),
    {
      CMS_ADMIN_ORIGIN: "https://runtime.example.com",
    },
  );
});

test("Node runtime environment remains available when a dispatcher supplies fallback bindings", async () => {
  const previous = process.env.WEB_CACHE_REDIS_URL;
  process.env.WEB_CACHE_REDIS_URL = "redis://container-cache:6379/0";
  try {
    const environment = await resolveServerEnvironment({ DEV: false });
    assert.equal(environment.WEB_CACHE_REDIS_URL, "redis://container-cache:6379/0");
    assert.equal(environment.DEV, false);
  } finally {
    if (previous === undefined) delete process.env.WEB_CACHE_REDIS_URL;
    else process.env.WEB_CACHE_REDIS_URL = previous;
  }
});
