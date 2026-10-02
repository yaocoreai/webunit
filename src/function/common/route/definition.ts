import type { FunctionScope } from "@/function/common/app/context";
import type { ApplicationServices } from "@/function/common/app/services";
import type { RouteRequestContext } from "./request-context";
import { memoizeAsync } from "../lazy/promise";
import type { RouteContract } from "../app/operation";
import { parseRouteName } from "./name";

export type RouteSurface = "public" | "user" | "admin" | "webhook" | "internal";
export type RouteSpec = Readonly<{ kind: string }>;
export type ResponseCookie = Readonly<{
  name: string;
  value: string;
  path?: string;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none" | "cross-site";
  maxAgeSeconds?: number;
}>;
export type RouteResponseEffects = Readonly<{
  cookies?: readonly ResponseCookie[];
}>;
export type DataResult<T = unknown> = Readonly<{
  type: "data";
  data: T;
  response?: RouteResponseEffects;
}>;
export type StreamResult = Readonly<{
  type: "stream";
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  headers?: HeadersInit;
}>;
export type FileResultCachePolicy = Readonly<{
  mode: "public";
  browserTtlSeconds: number;
  sharedTtlSeconds: number;
  staleWhileRevalidateSeconds: number;
  surrogateKeys: readonly string[];
}>;
export type FileResult = Readonly<{
  type: "file";
  body: BodyInit | null;
  headers?: HeadersInit;
  status?: number;
  cache?: FileResultCachePolicy;
}>;
export type RedirectResult = Readonly<{
  type: "redirect";
  status: 301 | 302;
  location: string;
}>;
export type OperationResult<T = unknown> =
  DataResult<T> | StreamResult | FileResult | RedirectResult;

export type RouteContext = Omit<FunctionScope, "capabilities"> &
  Readonly<{
    services: ApplicationServices;
    route: RouteDefinition;
    requestId: string;
    correlationId: string;
    executionId: string;
    signal: AbortSignal;
    deadlineAt: number;
    remainingTimeMs(): number;
    transport: "direct" | "http" | "queue" | "schedule" | "event";
    state: Map<string, unknown>;
    requestState: Map<string, unknown>;
    requestContext: RouteRequestContext;
    invoke(
      name: string,
      input: unknown,
      options?: Readonly<{
        transport?: RouteContext["transport"];
        requestId?: string;
        correlationId?: string;
        signal?: AbortSignal;
        deadlineAt?: number;
      }>,
    ): Promise<OperationResult>;
  }>;

export type Operation<TInput = unknown, TOutput = unknown> = Readonly<{
  execute(
    context: RouteContext,
    input: TInput,
  ): OperationResult<TOutput> | Promise<OperationResult<TOutput>>;
}>;
export type RouteMiddleware = (
  context: RouteContext,
  input: unknown,
  next: (input?: unknown) => Promise<OperationResult>,
) => OperationResult | Promise<OperationResult>;
export type MiddlewareReference = string | RouteMiddleware;
export type RouteDefinition = Readonly<{
  name: string;
  surface: RouteSurface;
  contract: RouteContract;
  policy?: RoutePolicy;
  specs: readonly RouteSpec[];
  middleware: readonly MiddlewareReference[];
  operation: Operation;
  getSpec<TSpec extends RouteSpec = RouteSpec>(kind: string): TSpec | undefined;
}>;

export type RouteInput = Readonly<{
  contract: RouteContract;
  policy?: RoutePolicy;
  specs?: readonly unknown[];
  middleware?: readonly MiddlewareReference[];
  operation: Operation;
}>;

export type RoutePolicy = Readonly<{
  deadlineMs?: number;
  rate?: Readonly<{
    bucket: string;
    limit: number;
    windowMs: number;
  }>;
}>;

const specKindPattern = /^[a-z][a-z0-9-]*$/;

export function defineRoute(name: string, input: RouteInput): RouteDefinition {
  const parsed = parseRouteName(name);
  if (!parsed)
    throw new TypeError(`Invalid Route name: ${name}`);
  if (!input.operation || typeof input.operation.execute !== "function")
    throw new TypeError(`Invalid Route operation: ${name}`);
  const specs = Object.freeze(
    (input.specs ?? []).map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new TypeError(`Invalid Route spec kind: ${name}`);
      const spec = value as RouteSpec;
      if (!specKindPattern.test(spec.kind))
        throw new TypeError(`Invalid Route spec kind: ${name}`);
      return spec;
    }),
  );
  const specEntries = specs.map((spec) => {
    return [spec.kind, spec] as const;
  });
  if (new Set(specEntries.map(([kind]) => kind)).size !== specEntries.length)
    throw new TypeError(`Duplicate Route spec kind: ${name}`);
  const specIndex = Object.freeze(Object.fromEntries(specEntries)) as Readonly<
    Record<string, RouteSpec>
  >;
  const middleware = Object.freeze([...(input.middleware ?? [])]);
  if (
    middleware.some(
      (entry) => typeof entry !== "string" && typeof entry !== "function",
    )
  )
    throw new TypeError(`Invalid Route middleware: ${name}`);
  const surface = parsed.surface;
  const policy = input.policy ? freezePolicy(input.policy, name) : undefined;
  return Object.freeze({
    name,
    surface,
    contract: input.contract,
    ...(policy ? { policy } : {}),
    specs,
    middleware,
    operation: input.operation,
    getSpec: <TSpec extends RouteSpec = RouteSpec>(kind: string) =>
      specIndex[kind] as TSpec | undefined,
  });
}

function freezePolicy(policy: RoutePolicy, name: string): RoutePolicy {
  if (
    policy.deadlineMs !== undefined &&
    (!Number.isSafeInteger(policy.deadlineMs) || policy.deadlineMs < 1)
  )
    throw new TypeError(`Invalid Route deadline policy: ${name}`);
  if (policy.rate) {
    if (!policy.rate.bucket.trim())
      throw new TypeError(`Invalid Route rate bucket: ${name}`);
    if (!Number.isSafeInteger(policy.rate.limit) || policy.rate.limit < 1)
      throw new TypeError(`Invalid Route rate limit: ${name}`);
    if (!Number.isSafeInteger(policy.rate.windowMs) || policy.rate.windowMs < 1)
      throw new TypeError(`Invalid Route rate window: ${name}`);
  }
  return Object.freeze({
    ...policy,
    ...(policy.rate ? { rate: Object.freeze({ ...policy.rate }) } : {}),
  });
}

export const defineCommand = <TInput, TOutput>(
  operation: Operation<TInput, TOutput>,
) => Object.freeze({ ...operation });
export const defineQuery = defineCommand;
export const data = <T>(
  value: T,
  response?: RouteResponseEffects,
): DataResult<T> => ({
  type: "data",
  data: value,
  ...(response ? { response: freezeResponseEffects(response) } : {}),
});
export const stream = (
  value: ReadableStream<Uint8Array>,
  contentType: string,
  headers?: HeadersInit,
): StreamResult => ({
  type: "stream",
  stream: value,
  contentType,
  ...(headers ? { headers } : {}),
});

export function lazyOperation<TInput = unknown, TOutput = unknown>(
  loader: () => Promise<Operation<TInput, TOutput>>,
): Operation<TInput, TOutput> {
  const resolve = memoizeAsync(loader);
  return Object.freeze({
    async execute(context, input) {
      const operation = await resolve();
      if (!operation || typeof operation.execute !== "function")
        throw new TypeError(
          "Lazy Operation loader returned an invalid Operation",
        );
      return operation.execute(context, input);
    },
  });
}

export function lazyRouteMiddleware(
  loader: () => Promise<RouteMiddleware>,
): RouteMiddleware {
  const resolve = memoizeAsync(loader);
  return async (context, input, next) => {
    const middleware = await resolve();
    if (typeof middleware !== "function")
      throw new TypeError(
        "Lazy Route middleware loader returned an invalid middleware",
      );
    return middleware(context, input, next);
  };
}

function freezeResponseEffects(
  effects: RouteResponseEffects,
): RouteResponseEffects {
  return Object.freeze({
    ...(effects.cookies
      ? {
          cookies: Object.freeze(
            effects.cookies.map((cookie) => Object.freeze({ ...cookie })),
          ),
        }
      : {}),
  });
}
