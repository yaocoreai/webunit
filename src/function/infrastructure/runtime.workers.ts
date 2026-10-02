import { createWorkersCapabilities } from "./workers/capabilities";

export function createFunctionRuntimePrimitives(
  environment: Readonly<Record<string, unknown>>,
) {
  return createWorkersCapabilities(environment);
}

export async function closeFunctionInfrastructure() {}
