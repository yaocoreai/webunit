import type { RateLimitResult } from "@/function/common/capabilities/contracts";
import type { DurableObjectState } from "./durable-object-types";

export class RateLimitDurableObjectCore {
  constructor(private readonly state: DurableObjectState) {}
  async fetch(request: Request) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/consume") return new Response(null, { status: 404 });
    const input = await request.json() as { limit: number; windowMs: number };
    if (!Number.isSafeInteger(input.limit) || input.limit <= 0 || !Number.isSafeInteger(input.windowMs) || input.windowMs <= 0) return Response.json({ error: "invalid rate limit policy" }, { status: 400 });
    const now = Date.now();
    const current = await this.state.storage.get<{ count: number; resetAt: number }>("counter");
    const active = current && current.resetAt > now ? current : { count: 0, resetAt: now + input.windowMs };
    const count = active.count + 1;
    if (active !== current) await this.state.storage.setAlarm(active.resetAt);
    await this.state.storage.put("counter", { count, resetAt: active.resetAt });
    return Response.json({ enabled: true, allowed: count <= input.limit, limit: input.limit, remaining: Math.max(input.limit - count, 0), resetAt: active.resetAt, retryAfterSeconds: Math.max(1, Math.ceil((active.resetAt - now) / 1000)) } satisfies RateLimitResult);
  }
  async alarm() { await this.state.storage.deleteAll(); }
}
