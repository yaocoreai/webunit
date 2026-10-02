import { functionHttpRouteByName } from "@/platform/generated/function-api/protocol";

export type FunctionHttpRequest = Readonly<{
  url: URL;
  init: RequestInit;
}>;

export function createFunctionHttpRequest(
  origin: string,
  name: string,
  input: unknown,
  options: Readonly<{ headers?: HeadersInit; signal?: AbortSignal }> = {},
): FunctionHttpRequest {
  const route = functionHttpRouteByName[name];
  if (!route) throw new TypeError(`Unknown HTTP Function Route: ${name}`);
  const values = asInputRecord(input);
  const headers = new Headers(options.headers);
  headers.set("accept", route.response === "data" ? "application/json" : "*/*");
  let path = route.path;
  const url = new URL(origin);

  if (route.input === "json") {
    headers.set("content-type", "application/json");
    url.pathname = `/_${path}`;
    url.search = "";
    url.hash = "";
    return Object.freeze({
      url,
      init: Object.freeze({
        method: route.method,
        credentials: "same-origin",
        headers,
        body: JSON.stringify(input),
        ...(options.signal ? { signal: options.signal } : {}),
      }),
    });
  }

  for (const [parameter, field] of Object.entries(route.input.path ?? {})) {
    const value = requiredText(values[field], field);
    path = parameter === "wildcard"
      ? path.replace("*", encodeWildcard(value))
      : path.replace(`:${parameter}`, encodeURIComponent(value));
  }
  if (/\*|:[A-Za-z]/.test(path))
    throw new TypeError(`Function ${name} is missing a path input`);
  url.pathname = `/_${path}`;
  url.search = "";
  url.hash = "";
  for (const [parameter, field] of Object.entries(route.input.query ?? {}))
    appendValues(url.searchParams, parameter, values[field]);
  for (const [header, field] of Object.entries(route.input.headers ?? {})) {
    const value = values[field];
    if (value !== undefined && value !== null) headers.set(header, String(value));
  }
  return Object.freeze({
    url,
    init: Object.freeze({
      method: route.method,
      credentials: "same-origin",
      headers,
      ...(options.signal ? { signal: options.signal } : {}),
    }),
  });
}

function asInputRecord(input: unknown): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    throw new TypeError("Function input must be an object");
  return input as Readonly<Record<string, unknown>>;
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value)
    throw new TypeError(`Function path input ${field} is required`);
  return value;
}

function encodeWildcard(value: string) {
  const segments = value.replace(/^\/+|\/+$/g, "").split("/");
  if (!segments[0]) throw new TypeError("Function wildcard path is required");
  return segments.map(encodeURIComponent).join("/");
}

function appendValues(search: URLSearchParams, name: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    for (const item of value) search.append(name, String(item));
    return;
  }
  search.set(name, String(value));
}
