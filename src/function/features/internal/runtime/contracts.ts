import {
  defineAuthenticatedRouteContract,
  definePublicRouteContract,
} from "@/function/common/app/route-contract";
import { s, type Shape } from "@/function/common/app/schema";

export const runtimeCapabilityKeys = [
  "database",
  "storage",
  "cache",
  "rateLimit",
  "config",
  "enums",
  "geo",
  "dataProtection",
] as const;

export type RuntimeCapabilityKey = (typeof runtimeCapabilityKeys)[number];
export type RuntimeCapability = Readonly<{
  available: boolean;
  status: "available" | "disabled";
}>;
export type RuntimeCheck = Readonly<{
  status: "healthy" | "degraded" | "unavailable" | "disabled";
  data?: Readonly<Record<string, unknown>>;
  error?: Readonly<{ code: string; message: string }>;
}>;

export type RuntimeOverview = Readonly<{
  platform: Readonly<{
    deployment: "node" | "container" | "workers";
    mode: "development" | "production" | "test";
  }>;
  capabilities: Readonly<Record<RuntimeCapabilityKey, RuntimeCapability>>;
  operational: Readonly<{
    status: "healthy" | "degraded";
    checkedAt: string;
    checks: Readonly<Record<string, RuntimeCheck>>;
  }>;
  requestId: string;
}>;

const emptyObjectSchema = s.object({});

const runtimeHealthOutputSchema = s.object({
  status: s.literal("ok"),
  service: s.literal("webunit-site"),
  requestId: s.string(),
});

const runtimeCapabilitySchema = s.object({
  available: s.boolean(),
  status: s.enum(["available", "disabled"] as const),
});

const runtimeCheckSchema = s.object({
  status: s.enum(["healthy", "degraded", "unavailable", "disabled"] as const),
  data: s.object({}).passthrough().optional(),
  error: s.object({ code: s.string(), message: s.string() }).optional(),
});

const runtimeOverviewOutputSchema = s.object({
  platform: s.object({
    deployment: s.enum(["node", "container", "workers"] as const),
    mode: s.enum(["development", "production", "test"] as const),
  }),
  capabilities: s.object(Object.fromEntries(
    runtimeCapabilityKeys.map((key) => [key, runtimeCapabilitySchema]),
  ) as Shape),
  operational: s.object({
    status: s.enum(["healthy", "degraded"] as const),
    checkedAt: s.string(),
    checks: s.record(s.string(), runtimeCheckSchema),
  }),
  requestId: s.string(),
});

export const runtimeHealthContract = definePublicRouteContract(emptyObjectSchema, [], runtimeHealthOutputSchema);
export const runtimeOverviewContract = defineAuthenticatedRouteContract(emptyObjectSchema, [], runtimeOverviewOutputSchema);
