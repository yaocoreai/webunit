import type { RouteSpec } from "./definition";

export type FunctionHttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD";

export type FunctionHttpInputSource = Readonly<{
  path?: Readonly<Record<string, string>>;
  query?: Readonly<Record<string, string>>;
  headers?: Readonly<Record<string, string>>;
}>;

export type FunctionHttpRouteSpec = RouteSpec &
  Readonly<{
    kind: "http";
    method: FunctionHttpMethod;
    path: string;
    input?: FunctionHttpInputSource;
  }>;

export type FunctionHttpRouteManifestEntry = Readonly<{
  name: string;
  method: FunctionHttpMethod;
  path: string;
  input: "json" | FunctionHttpInputSource;
  response: "data" | "file" | "stream";
}>;

export function httpRoute(
  input: Omit<FunctionHttpRouteSpec, "kind">,
): FunctionHttpRouteSpec {
  assertHttpPath(input.path);
  const source = input.input
    ? Object.freeze({
        ...(input.input.path
          ? { path: freezeFieldMap(input.input.path, "path") }
          : {}),
        ...(input.input.query
          ? { query: freezeFieldMap(input.input.query, "query") }
          : {}),
        ...(input.input.headers
          ? { headers: freezeFieldMap(input.input.headers, "headers") }
          : {}),
      })
    : undefined;
  return Object.freeze({
    kind: "http",
    method: input.method,
    path: input.path,
    ...(source ? { input: source } : {}),
  });
}

function freezeFieldMap(
  values: Readonly<Record<string, string>>,
  source: string,
) {
  const result: Record<string, string> = {};
  for (const [key, field] of Object.entries(values)) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key))
      throw new TypeError(`Invalid Function HTTP ${source} key: ${key}`);
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(field))
      throw new TypeError(`Invalid Function HTTP input field: ${field}`);
    result[key] = field;
  }
  return Object.freeze(result);
}

function assertHttpPath(path: string) {
  if (!path.startsWith("/") || (path.length > 1 && path.endsWith("/")))
    throw new TypeError(`Invalid Function HTTP path: ${path}`);
  const segments = path.split("/").slice(1);
  for (const [index, segment] of segments.entries()) {
    if (
      !segment ||
      !/^(?:[a-z0-9._-]+|:[A-Za-z][A-Za-z0-9]*|\*)$/.test(segment)
    )
      throw new TypeError(`Invalid Function HTTP path segment: ${path}`);
    if (segment === "*" && index !== segments.length - 1)
      throw new TypeError(
        `Function HTTP wildcard must be the final path segment: ${path}`,
      );
  }
}
