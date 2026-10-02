import type { RateLimiter, RateLimitResult } from "@/function/common/capabilities/contracts";
import { DurableObject } from "cloudflare:workers";
import type { DurableObjectNamespace, DurableObjectState } from "./durable-object-types";
import { RateLimitDurableObjectCore } from "./rate-limit-core";

export function createWorkersRateLimiter(namespace: DurableObjectNamespace): RateLimiter {
  return {
    async consume(input) {
      const id = namespace.idFromName(await hash(`${input.bucket}:${input.key}`));
      const response = await namespace.get(id).fetch("https://rate-limit.internal/consume", { method: "POST", body: JSON.stringify(input) });
      if (!response.ok) throw new Error(`Rate limiter request failed: ${response.status}`);
      return response.json() as Promise<RateLimitResult>;
    },
  };
}

export class WebunitRateLimitDurableObject extends DurableObject<Record<string, unknown>> {
  private readonly core: RateLimitDurableObjectCore;
  constructor(state: DurableObjectState, env: Record<string, unknown>) { super(state as never, env); this.core = new RateLimitDurableObjectCore(state); }
  fetch(request: Request) { return this.core.fetch(request); }
  alarm() { return this.core.alarm(); }
}

async function hash(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (part) => part.toString(16).padStart(2, "0")).join("");
}
