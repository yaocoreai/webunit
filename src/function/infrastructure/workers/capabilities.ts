import type {
  RuntimePrimitives,
  CacheStore,
} from "@/function/common/capabilities/contracts";
import {
  createLazyRateLimiter,
  createLazyObjectStorage,
} from "@/function/common/capabilities/lazy";
import type { DurableObjectNamespace } from "./durable-object-types";
import { observeDatabase } from "@/function/common/db/observability";
import { createDataProtection } from "@/function/common/data-protection/service";
import { createWorkersD1Database, type D1DatabaseBinding } from './d1-database';

const capabilitySets = new WeakMap<object, RuntimePrimitives>();

export function createWorkersCapabilities(
  bindings: Readonly<Record<string, unknown>>,
): RuntimePrimitives {
  const existing = capabilitySets.get(bindings);
  if (existing) return existing;
  const database = isDatabase(bindings.DB)
    ? observeDatabase(createWorkersD1Database(bindings.DB))
    : undefined;
  const dataProtection = createDataProtection(bindings.FUNCTION_DATA_PROTECTION_KEY);
  const signedUploads = hasSignedUploads(bindings);
  const capabilities: RuntimePrimitives = {
    database,
    objectStorage: isR2Bucket(bindings.STORAGE)
      ? createLazyObjectStorage(
          async () =>
            (await import("./r2-storage")).createR2Storage(bindings.STORAGE, {
              origin: bindings.STORAGE_ORIGIN,
              secret: bindings.STORAGE_UPLOAD_SECRET,
            }),
          {
            signedPut: signedUploads,
            signedUploadPart: signedUploads,
          },
        )
      : undefined,
    cache: isCache(bindings.FUNCTION_CACHE) ? bindings.FUNCTION_CACHE : undefined,
    rateLimiter: isDurableObjectNamespace(bindings.RATE_LIMIT)
      ? createLazyRateLimiter(async () =>
          (await import("./rate-limit")).createWorkersRateLimiter(
            bindings.RATE_LIMIT as DurableObjectNamespace,
          ),
        )
      : undefined,
    ...(dataProtection ? { dataProtection } : {}),
  };
  capabilitySets.set(bindings, capabilities);
  return capabilities;
}

function hasSignedUploads(bindings: Readonly<Record<string, unknown>>) {
  if (
    typeof bindings.STORAGE_ORIGIN !== "string" ||
    typeof bindings.STORAGE_UPLOAD_SECRET !== "string" ||
    bindings.STORAGE_UPLOAD_SECRET.length < 32
  )
    return false;
  try {
    const origin = new URL(bindings.STORAGE_ORIGIN);
    return (
      ["http:", "https:"].includes(origin.protocol) &&
      origin.origin === bindings.STORAGE_ORIGIN
    );
  } catch {
    return false;
  }
}

function isDatabase(value: unknown): value is D1DatabaseBinding {
  return hasMethods(value, ["prepare", "batch"]);
}
function isCache(value: unknown): value is CacheStore {
  return hasMethods(value, ["get", "put", "delete"]);
}
function isR2Bucket(value: unknown) {
  return hasMethods(value, ["get", "put", "delete", "list"]);
}
function isDurableObjectNamespace(
  value: unknown,
): value is DurableObjectNamespace {
  return hasMethods(value, ["idFromName", "get"]);
}
function hasMethods(
  value: unknown,
  methods: readonly string[],
): value is Record<string, (...args: never[]) => unknown> {
  return Boolean(
    value &&
    typeof value === "object" &&
    methods.every(
      (method) =>
        typeof (value as Record<string, unknown>)[method] === "function",
    ),
  );
}
