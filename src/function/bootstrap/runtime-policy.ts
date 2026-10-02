import type {
  FunctionApplicationConfiguration,
  FunctionApplicationSecrets,
  FunctionRuntimeIdentity,
} from "@/function/common/app/context";
import { parseAllowedOrigins } from "@/function/common/route/origin-policy";

declare module "@/function/common/app/context" {
  interface FunctionApplicationConfiguration {
    allowedOrigins: readonly string[];
    allowLocalhostCors?: boolean;
    trustedClientIpHeaders?: readonly string[];
  }

  interface FunctionApplicationSecrets {
    storageReadUrlSecret?: string;
  }
}

export function createAppRuntimePolicy(
  environment: Readonly<Record<string, unknown>>,
  identity: FunctionRuntimeIdentity,
): Readonly<{
  configuration: FunctionApplicationConfiguration;
  secrets: FunctionApplicationSecrets;
}> {
  return Object.freeze({
    configuration: Object.freeze({
      allowedOrigins: parseAllowedOrigins(environment.FUNCTION_ORIGINS),
      allowLocalhostCors: identity.mode === "development",
      trustedClientIpHeaders: readTrustedClientIpHeaders(
        environment,
        identity.deployment,
      ),
    }),
    secrets: Object.freeze({
      storageReadUrlSecret: readSecret(environment.STORAGE_READ_URL_SECRET),
    }),
  });
}

function readSecret(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readTrustedClientIpHeaders(
  environment: Readonly<Record<string, unknown>>,
  deployment: FunctionRuntimeIdentity["deployment"],
) {
  if (deployment === "workers") return Object.freeze(["cf-connecting-ip"]);
  return environment.CMS_TRUST_PROXY === true ||
    environment.CMS_TRUST_PROXY === "true"
    ? Object.freeze(["x-forwarded-for", "x-real-ip"])
    : Object.freeze([]);
}
