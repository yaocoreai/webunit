import { type RouteContext } from "@/function/common/route/definition";
import { defineDataQuery } from "@/function/common/app/operation";
import {
  runtimeHealthContract,
  runtimeOverviewContract,
  runtimeCapabilityKeys,
  type RuntimeCapabilityKey,
  type RuntimeOverview,
} from "./contracts";

export const readHealth = defineDataQuery({
  contract: runtimeHealthContract,
  async execute({ requestId }) {
    return {
      status: "ok" as const,
      service: "webunit-site" as const,
      requestId,
    };
  },
});

export const readRuntimeOverview = defineDataQuery({
  contract: runtimeOverviewContract,
  async execute(context) {
    const available = capabilityAvailability(context);
    const result: RuntimeOverview = {
      platform: context.platform,
      capabilities: Object.fromEntries(
        runtimeCapabilityKeys.map((key) => [
          key,
          {
            available: available[key],
            status: available[key] ? "available" : "disabled",
          },
        ]),
      ) as RuntimeOverview["capabilities"],
      operational: {
        status: "healthy",
        checkedAt: new Date().toISOString(),
        checks: { runtime: { status: "healthy", data: { source: "process" } } },
      },
      requestId: context.requestId,
    };
    return result;
  },
});

function capabilityAvailability(
  context: RouteContext,
): Record<RuntimeCapabilityKey, boolean> {
  const services = context.services;
  return {
    database: services.has("database"),
    storage: services.has("storage"),
    cache: services.has("cache"),
    rateLimit: services.has("rateLimiter"),
    config: services.has("config"),
    enums: services.has("enums"),
    geo: services.has("geo"),
    dataProtection: services.has("dataProtection"),
  };
}
