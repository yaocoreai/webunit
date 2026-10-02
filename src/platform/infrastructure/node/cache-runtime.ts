import { resolve } from "node:path";
import type { Cache } from "@/platform/cache";
import { createFileCache } from "@/platform/infrastructure/node/cache";
import type { WebCacheEnvironment } from "@/platform/cache/runtime-environment";

const instances = new Map<string, Cache>();

export function connectWebCache(environment: WebCacheEnvironment): Cache {
  const directory = resolve(
    environment.WEB_DATA_DIR?.trim() || ".data/node/web",
    "cache",
  );
  const existing = instances.get(directory);
  if (existing) return existing;
  const cache = createFileCache(directory);
  instances.set(directory, cache);
  return cache;
}
