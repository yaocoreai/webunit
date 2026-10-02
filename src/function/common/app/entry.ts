import type { RouteRequestContext } from "@/function/common/route/request-context";
import type {
  OperationResult,
  ResponseCookie,
  RouteResponseEffects,
} from "@/function/common/route/definition";
import { createFunctionRouteRuntime } from "@/function/common/route/application-runtime";
import { createFunctionHttpInvoker } from "@/function/common/route/http-runtime";
import type { RuntimePrimitives } from "@/function/common/capabilities/contracts";
import type { FunctionScope } from "./context";
import type {
  FunctionApplicationDefinition,
  FunctionApplicationHost,
} from "./application";

export type FunctionRequestContext = RouteRequestContext;
export type FunctionInvokeOptions = Readonly<{
  signal?: AbortSignal;
  deadlineAt?: number;
  transport?: "direct" | "http" | "queue" | "schedule" | "event";
}>;
export type FunctionInvoker = (
  name: string,
  input: unknown,
  options?: FunctionInvokeOptions,
) => Promise<OperationResult>;
export type FunctionSession = Readonly<{ invoke: FunctionInvoker }>;
export type FunctionHttpOutcome = Readonly<{
  requestId: string;
  status: number;
  headers: HeadersInit;
  head?: boolean;
  result?: OperationResult;
}>;
export type FunctionRoutesRuntime = Readonly<{
  has(name: string): boolean;
  createSession(
    context: FunctionRequestContext,
    options?: Readonly<{ requestId?: string; signal?: AbortSignal }>,
  ): FunctionSession;
  invokeHttp(request: Request): Promise<FunctionHttpOutcome>;
}>;

export type FunctionApplicationRuntime = Readonly<{
  routes: FunctionRoutesRuntime;
  lifecycle: Readonly<{ close(): Promise<void> }>;
}>;

export type FunctionApplicationEntry = Readonly<{
  create(host: FunctionApplicationHost): Promise<FunctionApplicationRuntime>;
  createScope(host: FunctionApplicationHost): Promise<FunctionScope>;
  createRuntimeScope(host: FunctionApplicationHost): Promise<Readonly<{
    scope: FunctionScope;
    runtime: RuntimePrimitives;
  }>>;
  startWorker(
    host: FunctionApplicationHost,
  ): Promise<Readonly<{ stop(): Promise<void> }>>;
}>;

export function createFunctionEntry(
  definition: FunctionApplicationDefinition,
): FunctionApplicationEntry {
  const routeRuntime = createFunctionRouteRuntime({
    ...definition.routes,
    log: (entry) => console.info(JSON.stringify(entry)),
  });
  const invokeHttp = createFunctionHttpInvoker(
    definition.routes.http,
    (scope, context, defaults) =>
      routeRuntime.createSession(scope, context, defaults),
  );

  const createRuntimeScope = async (host: FunctionApplicationHost) => {
    const runtime = definition.infrastructure.create(host.environment);
    const composition = definition.createComposition(runtime);
    const configured = definition.createConfiguration(
      host.environment,
      host.identity,
    );
    const scope: FunctionScope = Object.freeze({
      platform: host.identity,
      capabilities: composition.services,
      configuration: Object.freeze(configured.configuration),
      secrets: Object.freeze(configured.secrets),
      effects: host.effects,
    });
    return Object.freeze({ scope, runtime: composition.runtime });
  };

  const createRuntime = (
    scope: FunctionScope,
    primitives: RuntimePrimitives,
  ): FunctionApplicationRuntime => {
    const routes: FunctionRoutesRuntime = Object.freeze({
      has: routeRuntime.has,
      createSession: (context, options) =>
        routeRuntime.createSession(scope, context, options),
      invokeHttp: (request) => invokeHttp(request, scope),
    });
    let closing: Promise<void> | undefined;
    return Object.freeze({
      routes,
      lifecycle: Object.freeze({
        close() {
          return (closing ??= closeRuntime(
            primitives,
            definition.infrastructure.close,
          ));
        },
      }),
    });
  };

  return Object.freeze({
    async create(host) {
      const composition = await createRuntimeScope(host);
      return createRuntime(composition.scope, composition.runtime);
    },
    async createScope(host) {
      return (await createRuntimeScope(host)).scope;
    },
    createRuntimeScope,
    async startWorker(host) {
      const composition = await createRuntimeScope(host);
      const runtime = createRuntime(composition.scope, composition.runtime);
      return Object.freeze({
        async stop() {
          await runtime.lifecycle.close();
        },
      });
    },
  });
}

async function closeRuntime(
  primitives: RuntimePrimitives,
  closeInfrastructure: () => Promise<void>,
) {
  const database = primitives.database as
    | (NonNullable<typeof primitives.database> & { close?: () => void })
    | undefined;
  database?.close?.();
  await closeInfrastructure();
}

export type {
  OperationResult,
  ResponseCookie,
  RouteResponseEffects,
};
