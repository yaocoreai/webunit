import { createContainerCapabilities } from "./container/capabilities";
import { closeRedisClients } from "./server/redis-client";

export function createFunctionRuntimePrimitives(
  environment: Readonly<Record<string, unknown>>,
) {
  return createContainerCapabilities(environment);
}

export const closeFunctionInfrastructure = closeRedisClients;
