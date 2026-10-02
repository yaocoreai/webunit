import type { RuntimePrimitives } from "@/function/common/capabilities/contracts";
import { createLazyCache, createLazyRateLimiter } from "@/function/common/capabilities/lazy";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { createServerCoreCapabilities, readOptionalString } from "@/function/infrastructure/server/core-capabilities";

const capabilitySets = globalNodeCapabilitySets();

export function createNodeCapabilities(
  environment: Readonly<Record<string, unknown>>,
): RuntimePrimitives {
  const cacheDirectory = readOptionalString(environment.FUNCTION_CACHE_DIR) ?? resolve(process.cwd(), ".data/functions/cache");
  const identity = capabilitySetIdentity(environment, cacheDirectory);
  const existing = capabilitySets.get(identity);
  if (existing) return existing;
  const core = createServerCoreCapabilities(environment);
  const capabilities = Object.defineProperties({}, {
    ...Object.getOwnPropertyDescriptors(core),
    cache: { enumerable: true, value: createLazyCache(async () => (await import("./file-cache")).createFileCache(cacheDirectory)) },
    rateLimiter: { enumerable: true, value: createLazyRateLimiter(async () => (await import("./memory-rate-limiter")).createMemoryRateLimiter()) },
  }) as RuntimePrimitives;
  capabilitySets.set(identity, capabilities);
  return capabilities;
}

function capabilitySetIdentity(
  environment: Readonly<Record<string, unknown>>,
  cacheDirectory: string,
) {
  const configurationKeys = [
    "FUNCTION_CACHE_DIR",
    "GEOIP_ASN_DB_PATH",
    "GEOIP_CITY_DB_PATH",
    "GEOIP_COUNTRY_DB_PATH",
    "S3_ACCESS_KEY_ID",
    "S3_BUCKET",
    "S3_ENDPOINT",
    "S3_FORCE_PATH_STYLE",
    "S3_PUBLIC_ENDPOINT",
    "S3_REGION",
    "S3_SECRET_ACCESS_KEY",
    "FUNCTION_DATA_PROTECTION_KEY",
    "STORAGE_DRIVER",
    "WEB_DATABASE_FILE",
    "WEB_STORAGE_DIR",
  ] as const;
  const configuration = Object.fromEntries(
    configurationKeys.map((key) => [key, environment[key] ?? null]),
  );
  const payload = JSON.stringify({ configuration, cacheDirectory });
  return createHash("sha256").update(payload).digest("hex");
}

function globalNodeCapabilitySets() {
  const scope = globalThis as typeof globalThis & {
    __webunitNodeCapabilitySets?: Map<string, RuntimePrimitives>;
  };
  return scope.__webunitNodeCapabilitySets ??= new Map<string, RuntimePrimitives>();
}
