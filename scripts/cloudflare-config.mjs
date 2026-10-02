import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlatformEnvironment } from "./environment.mjs";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const envFile = new URL("../.env.cloudflare", import.meta.url);

export function cloudflareWranglerEnvironment(fileEnv, runtimeEnv = {}) {
  const env = { ...fileEnv };
  if (typeof runtimeEnv.NODE_ENV === "string" && runtimeEnv.NODE_ENV.trim())
    env.NODE_ENV = runtimeEnv.NODE_ENV.trim();
  return env;
}

export function fillCloudflareConfig(source, env, storageWorker) {
  const required = (name) => {
    const value = typeof env[name] === "string" ? env[name].trim() : "";
    if (!value) throw new Error(`${name} is required in source/.env.cloudflare`);
    return value;
  };
  const optional = (name) => {
    const value = typeof env[name] === "string" ? env[name].trim() : "";
    return value || undefined;
  };
  if (source.main) source.main = resolve(appRoot, source.main);
  source.account_id = required("CLOUDFLARE_ACCOUNT_ID");
  source.vars = storageWorker
    ? { FUNCTION_ORIGINS: required("FUNCTION_ORIGINS") }
    : {
        NODE_ENV: required("NODE_ENV"),
        SITE_ORIGIN: required("SITE_ORIGIN"),
        THEME_INTERFACE_KEY: required("THEME_INTERFACE_KEY"),
        FUNCTION_ORIGINS: required("FUNCTION_ORIGINS"),
        STORAGE_ORIGIN: required("STORAGE_ORIGIN"),
      };
  if (!storageWorker) {
    for (const name of [
      "CMS_TRUST_PROXY",
      "CMS_CONTENT_TIMEOUT_MS",
      "CMS_FUNCTION_TIMEOUT_MS",
      "CMS_DOCUMENT_CSP",
      "CMS_PERMISSIONS_POLICY",
      "CMS_CONTENT_CACHE_MODE",
      "CMS_CONTENT_CACHE_BROWSER_TTL_SECONDS",
      "CMS_CONTENT_CACHE_SHARED_TTL_SECONDS",
      "CMS_CONTENT_CACHE_STALE_WHILE_REVALIDATE_SECONDS",
      "CMS_DOCUMENT_CACHE_MODE",
      "CMS_DOCUMENT_CACHE_BROWSER_TTL_SECONDS",
      "CMS_DOCUMENT_CACHE_SHARED_TTL_SECONDS",
      "CMS_DOCUMENT_CACHE_STALE_WHILE_REVALIDATE_SECONDS",
    ]) {
      const value = optional(name);
      if (value) source.vars[name] = value;
    }
    source.d1_databases[0].database_id = required("CLOUDFLARE_D1_DATABASE_ID");
    source.d1_databases[0].database_name = required("CLOUDFLARE_D1_DATABASE_NAME");
  }
  source.r2_buckets[0].bucket_name = required("CLOUDFLARE_R2_BUCKET_NAME");
  if (!storageWorker) {
    const functionCacheNamespace = source.kv_namespaces?.find((item) => item.binding === "FUNCTION_CACHE");
    const webCacheNamespace = source.kv_namespaces?.find((item) => item.binding === "WEB_CACHE");
    const sessionNamespace = source.kv_namespaces?.find((item) => item.binding === "SESSION");
    if (!functionCacheNamespace || !webCacheNamespace || !sessionNamespace)
      throw new Error("wrangler.jsonc is missing a KV binding");
    functionCacheNamespace.id = required("CLOUDFLARE_FUNCTION_CACHE_KV_NAMESPACE_ID");
    webCacheNamespace.id = required("CLOUDFLARE_WEB_CACHE_KV_NAMESPACE_ID");
    sessionNamespace.id = required("CLOUDFLARE_SESSION_KV_NAMESPACE_ID");
  }
  return source;
}

const invokedDirectly = process.argv[1]?.endsWith("cloudflare-config.mjs") === true;
if (invokedDirectly) {
  await access(envFile).catch((error) => {
    if (error?.code === "ENOENT") throw new Error("source/.env.cloudflare is required");
    throw error;
  });
  const fileEnv = {};
  await loadPlatformEnvironment("cloudflare", new URL("../", import.meta.url), fileEnv);
  const storageWorker = process.argv[2] === "storage";
  const source = JSON.parse(
    (await readFile(resolve(appRoot, storageWorker ? "wrangler.storage.jsonc" : "wrangler.jsonc"), "utf8")).replace(
      /^\s*\/\/.*$/gm,
      "",
    ),
  );
  fillCloudflareConfig(source, cloudflareWranglerEnvironment(fileEnv, process.env), storageWorker);
  const output = resolve(appRoot, storageWorker ? ".wrangler/storage-cloudflare.json" : ".wrangler/runtime-cloudflare.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(source, null, 2)}\n`);
  console.log(output);
}
