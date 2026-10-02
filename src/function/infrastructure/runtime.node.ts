import { createNodeCapabilities } from "./node/capabilities";

export function createFunctionRuntimePrimitives(
  environment: Readonly<Record<string, unknown>>,
) {
  return createNodeCapabilities(environment);
}

export async function closeFunctionInfrastructure() {}
