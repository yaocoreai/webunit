import type { PlatformExecutionContext } from "@/platform/runtime/execution-context";
import type { FunctionRequestContext } from "@/function/common/app/entry";
import { createGeneratedPublicDirectFunctionApi } from "@/platform/generated/function-api/public-direct";
import type {
  FunctionInvoker,
  FunctionRouteDirectOutputMap,
} from "@/platform/generated/function-api/types";
import {
  type DirectResponseEffectsHandler,
  unwrapDirectOperationResult,
} from "./response-effects";

export type FunctionDirectSessionOptions = Readonly<{
  bindings: Readonly<Record<string, unknown>>;
  executionContext?: PlatformExecutionContext;
  requestId: string;
  requestContext(): Promise<FunctionRequestContext>;
  signal: AbortSignal;
  onResponseEffects?: DirectResponseEffectsHandler;
}>;

export function createFunctionDirectInvoker(options: FunctionDirectSessionOptions) {
  let session: Promise<import("../runtime").FunctionRouteSession> | undefined;
  const loadSession = () => session ??= Promise.all([
    import("../runtime"),
    options.requestContext(),
  ]).then(([module, requestContext]) =>
    module.functionRuntime.createRequestSession(
      options.bindings,
      options.executionContext,
      {
        requestId: options.requestId,
        requestContext,
        signal: options.signal,
      },
    )
  );

  return (async (
    name,
    input,
    callOptions,
  ) => {
    const result = await (await loadSession()).invoke(name, input, {
      signal: callOptions?.signal,
    });
    return unwrapDirectOperationResult(
      result,
      options.onResponseEffects,
    ) as FunctionRouteDirectOutputMap[typeof name];
  }) satisfies FunctionInvoker<FunctionRouteDirectOutputMap>;
}

export function createFunctionDirectRuntime(options: FunctionDirectSessionOptions) {
  const api = createGeneratedPublicDirectFunctionApi(
    createFunctionDirectInvoker(options),
  );
  return Object.freeze({ api });
}

export function createFunctionDirectClient(options: FunctionDirectSessionOptions) {
  return createFunctionDirectRuntime(options).api;
}
