import { createCache, decodeCacheValue, type Cache } from "./cache";
import type { EncodedJsonRow } from "./codec";

type MemoryCacheRecord = Readonly<{
  value: EncodedJsonRow;
  expiresAt?: number;
}>;

export function createMemoryCache(): Cache {
  const records = new Map<string, MemoryCacheRecord>();
  return createCache({
    async get(key) {
      const record = records.get(key);
      if (!record) return undefined;
      if (record.expiresAt !== undefined && record.expiresAt <= Date.now()) {
        records.delete(key);
        return undefined;
      }
      return decodeCacheValue(record.value) as never;
    },
    async set(key, value, options) {
      records.set(key, {
        value,
        ...(options?.ttlSeconds
          ? { expiresAt: Date.now() + options.ttlSeconds * 1_000 }
          : {}),
      });
    },
    async delete(key) {
      records.delete(key);
    },
  });
}
