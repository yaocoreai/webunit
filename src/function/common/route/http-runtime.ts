import type { FunctionScope } from "@/function/common/app/context";
import { RouteFailure } from "@/function/common/app/failure";
import type {
  FunctionHttpOutcome,
  FunctionRequestContext,
  FunctionSession,
} from "@/function/common/app/entry";
import type {
  FunctionHttpInputSource,
  FunctionHttpRouteManifestEntry,
} from "@/function/common/route/http";
import { createHttpFunctionRequestContext } from "./http-request-context";

const maximumJsonInputBytes = 1024 * 1024;
type FunctionHttpSessionFactory = (
  scope: FunctionScope,
  context: FunctionRequestContext,
  defaults: Readonly<{ requestId?: string; signal?: AbortSignal }>,
) => FunctionSession;
type CompiledHttpRoute = Readonly<{
  entry: FunctionHttpRouteManifestEntry;
  segments: readonly string[];
}>;
type CompiledHttpRoutes = Readonly<{
  exact: ReadonlyMap<string, readonly CompiledHttpRoute[]>;
  dynamic: readonly CompiledHttpRoute[];
}>;

export function createFunctionHttpInvoker(
  routes: readonly FunctionHttpRouteManifestEntry[],
  sessionFactory: FunctionHttpSessionFactory,
) {
  const compiledRoutes = compileHttpRoutes(routes);
  return (request: Request, scope: FunctionScope) =>
    invokeHttp(request, scope, compiledRoutes, sessionFactory);
}

async function invokeHttp(
  request: Request,
  scope: FunctionScope,
  compiledRoutes: CompiledHttpRoutes,
  sessionFactory: FunctionHttpSessionFactory,
): Promise<FunctionHttpOutcome> {
  const requestId = normalizeRequestId(request.headers.get("x-request-id"));
  let responseHeaders = new Headers();
  try {
    const url = new URL(request.url);
    const path = stripFunctionBasePath(url.pathname);
    if (path === undefined)
      throw failure(404, "route_not_found", "Not found", "not_found");
    const matches = matchPath(path, compiledRoutes);
    if (!matches.length)
      throw failure(404, "route_not_found", "Not found", "not_found");
    responseHeaders = corsHeaders(request, scope, matches.map(({ entry }) => entry));
    if (request.method === "OPTIONS")
      return {
        requestId,
        status: 204,
        headers: responseHeaders,
      };
    const method = request.method.toUpperCase();
    const matched =
      matches.find(({ entry }) => entry.method === method) ??
      (method === "HEAD"
        ? matches.find(({ entry }) => entry.method === "GET")
        : undefined);
    if (!matched)
      throw failure(
        405,
        "method_not_allowed",
        "Method is not allowed",
        "invalid_argument",
        { allow: allowedMethods(matches.map(({ entry }) => entry)) },
      );
    const input = await readHttpInput(request, url, matched);
    const session = sessionFactory(
      scope,
      createHttpFunctionRequestContext(request, scope),
      { requestId, signal: request.signal },
    );
    const result = await session.invoke(matched.entry.name, input, {
      transport: "http",
    });
    return {
      requestId,
      status: 200,
      headers: responseHeaders,
      ...(method === "HEAD" ? { head: true } : {}),
      result,
    };
  } catch (error) {
    const resolved =
      error instanceof RouteFailure
        ? error
        : failure(500, "internal_error", "Internal server error", "internal");
    throw new RouteFailure({
      status: resolved.status,
      code: resolved.code,
      kind: resolved.kind,
      message: resolved.message,
      ...(resolved.details !== undefined ? { details: resolved.details } : {}),
      ...(resolved.retryAfterMs !== undefined
        ? { retryAfterMs: resolved.retryAfterMs }
        : {}),
      requestId,
      headers: mergeHeaders(responseHeaders, resolved.headers),
      cause: error,
    });
  }
}

function matchPath(
  path: string,
  compiledRoutes: CompiledHttpRoutes,
) {
  const exact = compiledRoutes.exact.get(normalizeStaticPath(path));
  if (exact)
    return exact.map(({ entry }) => ({ entry, params: {} }));
  const actual = splitPath(path);
  return compiledRoutes.dynamic.flatMap(({ entry, segments }) => {
    const params = matchSegments(segments, actual);
    return params ? [{ entry, params }] : [];
  });
}

function compileHttpRoutes(
  routes: readonly FunctionHttpRouteManifestEntry[],
): CompiledHttpRoutes {
  const exact = new Map<string, readonly CompiledHttpRoute[]>();
  const dynamic: CompiledHttpRoute[] = [];
  const identities = new Set<string>();
  for (const entry of routes) {
    const identity = `${entry.method} ${entry.path}`;
    if (identities.has(identity))
      throw new TypeError(`Duplicate Function HTTP Route: ${identity}`);
    identities.add(identity);
    const segments = splitPath(entry.path);
    const compiled = Object.freeze({ entry, segments });
    if (segments.some((segment) => segment === "*" || segment.startsWith(":"))) {
      dynamic.push(compiled);
      continue;
    }
    exact.set(entry.path, [...(exact.get(entry.path) ?? []), compiled]);
  }
  for (const [path, entries] of exact)
    exact.set(path, Object.freeze(entries));
  dynamic.sort(
    (left, right) =>
      routeSpecificity(right.segments) - routeSpecificity(left.segments) ||
      right.segments.length - left.segments.length ||
      left.entry.path.localeCompare(right.entry.path),
  );
  return Object.freeze({
    exact,
    dynamic: Object.freeze(dynamic),
  });
}

function normalizeStaticPath(path: string) {
  const segments = splitPath(path);
  return segments.length ? `/${segments.join("/")}` : "/";
}

async function readHttpInput(
  request: Request,
  url: URL,
  matched: Readonly<{
    entry: FunctionHttpRouteManifestEntry;
    params: Readonly<Record<string, string>>;
  }>,
) {
  if (matched.entry.input !== "json")
    return mapInput(matched.entry.input, matched.params, url, request.headers);
  if (!hasJsonMediaType(request.headers))
    throw failure(
      415,
      "unsupported_media_type",
      "Content-Type must be application/json",
      "invalid_argument",
    );
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maximumJsonInputBytes)
    throw failure(
      413,
      "input_too_large",
      "Input is too large",
      "resource_exhausted",
    );
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maximumJsonInputBytes)
    throw failure(
      413,
      "input_too_large",
      "Input is too large",
      "resource_exhausted",
    );
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    throw failure(
      400,
      "invalid_input",
      "Invalid JSON input",
      "invalid_argument",
      undefined,
      error,
    );
  }
}

function mapInput(
  source: FunctionHttpInputSource,
  params: Readonly<Record<string, string>>,
  url: URL,
  headers: Headers,
) {
  const input: Record<string, string> = {};
  for (const [name, field] of Object.entries(source.path ?? {})) {
    const value = params[name];
    if (value !== undefined) input[field] = value;
  }
  for (const [name, field] of Object.entries(source.query ?? {})) {
    const value = url.searchParams.get(name);
    if (value !== null) input[field] = value;
  }
  for (const [name, field] of Object.entries(source.headers ?? {})) {
    const value = headers.get(name);
    if (value !== null) input[field] = value;
  }
  return input;
}

function corsHeaders(
  request: Request,
  scope: FunctionScope,
  routes: readonly FunctionHttpRouteManifestEntry[],
) {
  const origin = request.headers.get("origin");
  const headers = new Headers({ allow: allowedMethods(routes) });
  if (!origin) return headers;
  const local = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
  if (
    !scope.configuration.allowedOrigins.includes(origin) &&
    !(scope.configuration.allowLocalhostCors && local)
  )
    throw failure(
      403,
      "origin_forbidden",
      "Origin is not allowed",
      "permission_denied",
    );
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-allow-methods", allowedMethods(routes));
  headers.set(
    "access-control-allow-headers",
    [
      "Authorization",
      "Content-Type",
      "Accept",
      "X-Request-Id",
    ].join(", "),
  );
  headers.set("access-control-expose-headers", "X-Request-Id");
  headers.set("access-control-max-age", "600");
  headers.set("vary", "Origin");
  return headers;
}

function allowedMethods(routes: readonly FunctionHttpRouteManifestEntry[]) {
  const methods = new Set<string>(routes.map((route) => route.method));
  if (methods.has("GET")) methods.add("HEAD");
  methods.add("OPTIONS");
  return [...methods].join(", ");
}

function matchSegments(pattern: readonly string[], actual: readonly string[]) {
  const wildcardIndex = pattern.indexOf("*");
  if (wildcardIndex < 0 && pattern.length !== actual.length) return undefined;
  if (wildcardIndex >= 0 && actual.length <= wildcardIndex) return undefined;
  const params: Record<string, string> = {};
  for (let index = 0; index < pattern.length; index += 1) {
    const expected = pattern[index]!;
    if (expected === "*") {
      try {
        params.wildcard = actual.slice(index).map(decodeURIComponent).join("/");
      } catch {
        return undefined;
      }
      return params;
    }
    const value = actual[index]!;
    if (!expected.startsWith(":")) {
      if (expected !== value) return undefined;
      continue;
    }
    try {
      params[expected.slice(1)] = decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return params;
}

function splitPath(path: string) {
  return path === "/" ? [] : path.replace(/^\/+|\/+$/g, "").split("/");
}

function routeSpecificity(segments: readonly string[]) {
  return segments.reduce(
    (score, segment) =>
      score + (segment === "*" ? 0 : segment.startsWith(":") ? 1 : 4),
    0,
  );
}

function stripFunctionBasePath(pathname: string) {
  return pathname === "/_"
    ? "/"
    : pathname.startsWith("/_/")
      ? pathname.slice(2)
      : undefined;
}

function hasJsonMediaType(headers: Headers) {
  const value = headers.get("content-type");
  return Boolean(
    value &&
      value.split(";", 1)[0]?.trim().toLowerCase() === "application/json",
  );
}

function normalizeRequestId(value: string | null) {
  return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : crypto.randomUUID();
}

function mergeHeaders(left: HeadersInit, right?: HeadersInit) {
  const headers = new Headers(left);
  new Headers(right).forEach((value, name) => headers.set(name, value));
  return headers;
}

function failure(
  status: number,
  code: string,
  message: string,
  kind: ConstructorParameters<typeof RouteFailure>[0]["kind"],
  headers?: HeadersInit,
  cause?: unknown,
) {
  return new RouteFailure({ status, code, kind, message, headers, cause });
}
