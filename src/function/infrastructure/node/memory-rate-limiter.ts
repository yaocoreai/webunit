import type { RateLimiter } from '@/function/common/capabilities/contracts';

export function createMemoryRateLimiter(): RateLimiter {
  const windows = new Map<string, { hits: number; resetAt: number }>();
  return { async consume(input) {
    const now = Date.now(), identity = `${input.bucket}:${input.key}`, current = windows.get(identity);
    const window = !current || current.resetAt <= now ? { hits: 0, resetAt: now + input.windowMs } : current;
    window.hits += 1; windows.set(identity, window);
    if (windows.size > 10_000) for (const [key, value] of windows) if (value.resetAt <= now) windows.delete(key);
    const allowed = window.hits <= input.limit;
    return { enabled: true, allowed, limit: input.limit, remaining: Math.max(0, input.limit - window.hits), resetAt: window.resetAt, retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((window.resetAt - now) / 1000)) };
  } };
}
