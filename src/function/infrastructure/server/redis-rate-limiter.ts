import type { RateLimiter } from "@/function/common/capabilities/contracts";
import { getRedisClient } from "./redis-client";

const consumeScript = "local c=redis.call('INCR',KEYS[1]); if c==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; local t=redis.call('PTTL',KEYS[1]); return {c,t}";

export function createRedisRateLimiter(url: string): RateLimiter {
  return {
    async consume(input) {
      const redis = await getRedisClient(url);
      const digest = await hash(input.key);
      const reply = await redis.eval(consumeScript, 1, `service:rate-limit:${input.bucket}:${digest}`, String(input.windowMs));
      if (!Array.isArray(reply) || reply.length !== 2) throw new Error("Unexpected Redis rate limit response");
      const count = Number(reply[0]);
      const ttl = Number(reply[1]);
      if (!Number.isSafeInteger(count) || !Number.isSafeInteger(ttl) || ttl < 0) throw new Error("Invalid Redis rate limit response");
      return { enabled: true, allowed: count <= input.limit, limit: input.limit, remaining: Math.max(input.limit - count, 0), resetAt: Date.now() + ttl, retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)) };
    },
  };
}

async function hash(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (part) => part.toString(16).padStart(2, "0")).join("");
}
