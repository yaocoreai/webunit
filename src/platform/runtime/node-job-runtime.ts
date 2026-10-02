import { startAppFunctionWorkerRuntime } from "@/function/bootstrap/application";
import type { PlatformExecutionContext } from "./execution-context";
import { resolveExecutionEffects } from "./execution-effects";
import { functionDeployment } from "./function-identity";
import { readApplicationMode } from "./identity";
import { purgeResponseCache } from "./response-cache-purge";

export function startWorkerRuntime(
  environment: Readonly<Record<string, unknown>>,
  executionContext?: PlatformExecutionContext,
) {
  return startAppFunctionWorkerRuntime(
    {
      environment,
      identity: Object.freeze({
        deployment: functionDeployment,
        mode: readApplicationMode(environment),
      }),
      effects: resolveExecutionEffects(executionContext, purgeResponseCache),
    },
  );
}
