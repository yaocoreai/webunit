import type { FunctionScope } from "@/function/common/app/context";
import type {
  OperationResult,
  RouteContext,
  RouteMiddleware,
} from "./definition";
import type { RouteRegistry } from "./registry";
import type { RouteRequestContext } from "./request-context";
import type { ApplicationServices } from "@/function/common/app/services";
import { createReadonlyRegistry, type ReadonlyRegistry } from "../registry";
import {
  ApplicationError,
  cancelledError,
  deadlineExceededError,
  internalError,
} from "../app/error";
import { compileRoute, type CompiledRoute } from "./compiled-route";

export type InvokeOptions = Readonly<{
  requestId?: string;
  correlationId?: string;
  signal?: AbortSignal;
  deadlineAt?: number;
  transport?: RouteContext["transport"];
  requestContext?: RouteRequestContext;
  requestState?: Map<string, unknown>;
}>;

export type RouteDispatcher = Readonly<{
  has(name: string): boolean;
  invoke(
    name: string,
    input: unknown,
    scope: FunctionScope,
    options?: InvokeOptions,
  ): Promise<OperationResult>;
}>;

export type RouteExecutionLog = Readonly<{
  route: string;
  surface: string;
  transport: RouteContext["transport"];
  requestId: string;
  correlationId: string;
  executionId: string;
  outcome: "completed" | "failed" | "cancelled" | "deadline-exceeded";
  durationMs: number;
  error?: Readonly<{ code: string; kind: string }>;
}>;

export function createRouteDispatcher(
  options: Readonly<{
    routes: RouteRegistry;
    middleware?: ReadonlyRegistry<RouteMiddleware>;
    timeoutMs?: number;
    log?: (entry: RouteExecutionLog) => void;
    services?: (scope: FunctionScope) => ApplicationServices;
  }>,
): RouteDispatcher {
  const middleware =
    options.middleware ?? createReadonlyRegistry([], "Route middleware");
  const timeoutMs = options.timeoutMs ?? 30_000;
  const compiled = new WeakMap<
    import("./definition").RouteDefinition,
    CompiledRoute
  >();
  const dispatcher: RouteDispatcher = {
    has(name) {
      return options.routes.has(name);
    },
    async invoke(name, input, scope, invokeOptions = {}) {
      const route = await options.routes.resolve(name);
      if (!route) throw internalError(new Error(`Route not found: ${name}`));
      const requestId = normalizeRequestId(invokeOptions.requestId);
      const correlationId = normalizeRequestId(
        invokeOptions.correlationId ?? requestId,
      );
      const executionId = crypto.randomUUID();
      const deadlineAt = Math.min(
        invokeOptions.deadlineAt ?? Number.POSITIVE_INFINITY,
        Date.now() + (route.policy?.deadlineMs ?? timeoutMs),
      );
      const controller = new AbortController();
      const callerSignal = invokeOptions.signal;
      const abort = () => controller.abort(callerSignal?.reason);
      callerSignal?.addEventListener("abort", abort, { once: true });
      if (callerSignal?.aborted) abort();
      const timer = setTimeout(
        () =>
          controller.abort(new DOMException("Route timed out", "TimeoutError")),
        Math.max(0, deadlineAt - Date.now()),
      );
      const { capabilities, ...applicationScope } = scope;
      const requestState =
        invokeOptions.requestState ?? new Map<string, unknown>();
      const context: RouteContext = {
        ...applicationScope,
        services: options.services?.(scope) ?? capabilities,
        route,
        requestId,
        correlationId,
        executionId,
        signal: controller.signal,
        deadlineAt,
        remainingTimeMs: () => Math.max(0, deadlineAt - Date.now()),
        transport: invokeOptions.transport ?? "direct",
        state: new Map(),
        requestState,
        requestContext: invokeOptions.requestContext ?? { client: {} },
        invoke: (routeName, routeInput, routeOptions) =>
          dispatcher.invoke(routeName, routeInput, scope, {
            ...routeOptions,
            requestId: routeOptions?.requestId ?? requestId,
            correlationId: routeOptions?.correlationId ?? correlationId,
            signal: routeOptions?.signal ?? controller.signal,
            deadlineAt: Math.min(
              routeOptions?.deadlineAt ?? Number.POSITIVE_INFINITY,
              deadlineAt,
            ),
            requestContext: invokeOptions.requestContext,
            requestState,
          }),
      };
      const startedAt = performance.now();
      try {
        if (controller.signal.aborted)
          throw cancelledError(controller.signal.reason);
        const plan = resolveCompiledRoute(route, middleware, compiled);
        const result = await execute(
          plan.middleware,
          context,
          input,
          (finalInput) => route.operation.execute(context, finalInput),
        );
        emitExecution(
          logEntry(route, context, "completed", startedAt),
          options.log,
        );
        return result;
      } catch (error) {
        const normalized =
          controller.signal.aborted &&
          controller.signal.reason?.name === "TimeoutError"
            ? deadlineExceededError(controller.signal.reason)
            : controller.signal.aborted
              ? cancelledError(controller.signal.reason)
              : error instanceof ApplicationError
                ? error
                : internalError(error);
        const outcome =
          normalized instanceof ApplicationError
            ? normalized.kind === "deadline_exceeded"
              ? "deadline-exceeded"
              : normalized.kind === "cancelled"
                ? "cancelled"
                : "failed"
            : "failed";
        emitExecution(
          logEntry(route, context, outcome, startedAt, normalized),
          options.log,
        );
        throw normalized;
      } finally {
        clearTimeout(timer);
        callerSignal?.removeEventListener("abort", abort);
      }
    },
  };
  return dispatcher;
}

function emitExecution(
  entry: RouteExecutionLog,
  log?: (entry: RouteExecutionLog) => void,
) {
  log?.(entry);
}

function logEntry(
  route: Readonly<{ name: string; surface: string }>,
  context: Pick<
    RouteContext,
    "transport" | "requestId" | "correlationId" | "executionId"
  >,
  outcome: RouteExecutionLog["outcome"],
  startedAt: number,
  error?: unknown,
): RouteExecutionLog {
  return {
    route: route.name,
    surface: route.surface,
    transport: context.transport,
    requestId: context.requestId,
    correlationId: context.correlationId,
    executionId: context.executionId,
    outcome,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    ...(error ? { error: normalizeLogError(error) } : {}),
  };
}

function normalizeLogError(error: unknown) {
  if (error instanceof ApplicationError)
    return Object.freeze({ code: error.code, kind: error.kind });
  return Object.freeze({ code: "internal_error", kind: "internal" });
}

function resolveCompiledRoute(
  route: import("./definition").RouteDefinition,
  registry: ReadonlyRegistry<RouteMiddleware>,
  compiled: WeakMap<import("./definition").RouteDefinition, CompiledRoute>,
) {
  const existing = compiled.get(route);
  if (existing) return existing;
  const plan = compileRoute(route, registry);
  compiled.set(route, plan);
  return plan;
}

async function execute(
  middleware: readonly RouteMiddleware[],
  context: RouteContext,
  input: unknown,
  operation: (input: unknown) => Promise<OperationResult> | OperationResult,
): Promise<OperationResult> {
  const dispatch = async (
    index: number,
    currentInput: unknown,
  ): Promise<OperationResult> => {
    const current = middleware[index];
    if (!current) return operation(currentInput);
    let called = false;
    return current(context, currentInput, async (nextInput = currentInput) => {
      if (called) throw new TypeError("Route middleware next() called twice");
      called = true;
      return dispatch(index + 1, nextInput);
    });
  };
  return dispatch(0, input);
}

function normalizeRequestId(value?: string) {
  return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : crypto.randomUUID();
}
