import type { FunctionApplicationRuntime } from "@/function/common/app/entry";
import type {
  FunctionRequestContext,
  FunctionSession,
} from "@/function/common/app/entry";
import type { PlatformExecutionContext } from "@/platform/runtime/execution-context";
import { resolveExecutionEffects } from "@/platform/runtime/execution-effects";
import { functionDeployment } from "@/platform/runtime/function-identity";
import { readApplicationMode } from "@/platform/runtime/identity";
import { purgeResponseCache } from "@/platform/runtime/response-cache-purge";
import { createFunctionHttpGateway } from "./http/gateway";

export type FunctionRouteSession = FunctionSession;

export const functionRuntime = Object.freeze({
  async create(
    environment: Readonly<Record<string, unknown>>,
    executionContext?: PlatformExecutionContext,
  ): Promise<FunctionApplicationRuntime> {
    const { createAppFunctionRuntime } = await import("@/function/bootstrap/application");
    return createAppFunctionRuntime({
      environment,
      identity: Object.freeze({
        deployment: functionDeployment,
        mode: readApplicationMode(environment),
      }),
      effects: resolveExecutionEffects(executionContext, purgeResponseCache),
    });
  },
  async createRequestSession(
    environment: Readonly<Record<string, unknown>>,
    executionContext: PlatformExecutionContext | undefined,
    options: Readonly<{
      requestId: string;
      requestContext: FunctionRequestContext;
      signal: AbortSignal;
    }>,
  ): Promise<FunctionRouteSession> {
    const runtime = await this.create(environment, executionContext);
    return runtime.routes.createSession(options.requestContext, {
      requestId: options.requestId,
      signal: options.signal,
    });
  },
  async fetch(
    request: Request,
    environment: Readonly<Record<string, unknown>>,
    executionContext?: PlatformExecutionContext,
  ) {
    const runtime = await this.create(environment, executionContext);
    return createFunctionHttpGateway(runtime)(request);
  },
});
