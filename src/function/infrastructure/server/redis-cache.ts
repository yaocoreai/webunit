import type { CacheStore } from "@/function/common/capabilities/contracts";
import { getRedisClient } from "./redis-client";

export function createRedisCache(url: string, keyPrefix = "service:cache:"): CacheStore {
  const key = (value: string) => `${keyPrefix}${value}`;
  return {
    get: async (value) => (await getRedisClient(url)).get(key(value)),
    put: async (value, content, options) => {
      const redis = await getRedisClient(url);
      const ttl = options?.expirationTtl;
      if (ttl === undefined) await redis.set(key(value), content);
      else {
        if (!Number.isSafeInteger(ttl) || ttl <= 0) throw new Error("Invalid Cache TTL");
        await redis.set(key(value), content, "EX", ttl);
      }
    },
    delete: async (value) => { await (await getRedisClient(url)).del(key(value)); },
  };
}
