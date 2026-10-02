import { FunctionFailure } from "@/function/common/app/application";
import type {
  FunctionHttpOutcome,
  OperationResult,
} from "@/function/common/app/entry";
import { serializeResponseCookie } from "./response-cookie";
import { createCacheHeaders } from "@/platform/cache/headers";

export function createFunctionHttpGateway(
  runtime: Readonly<{
    routes: Readonly<{
      invokeHttp(request: Request): Promise<FunctionHttpOutcome>;
    }>;
  }>,
) {
  return async (request: Request): Promise<Response> => {
    try {
      return toHttpOutcomeResponse(
        await runtime.routes.invokeHttp(request),
        new URL(request.url),
      );
    } catch (error) {
      if (error instanceof FunctionFailure) return failureResponse(error);
      const requestId = crypto.randomUUID();
      console.error(
        JSON.stringify({
          event: "function_http_error",
          requestId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return errorResponse(
        500,
        "internal_error",
        "Internal server error",
        requestId,
      );
    }
  };
}

function toHttpOutcomeResponse(outcome: FunctionHttpOutcome, requestUrl: URL) {
  if (!outcome.result)
    return new Response(null, {
      status: outcome.status,
      headers: outcome.headers,
    });
  const response = toHttpResponse(outcome.result, outcome.requestId, requestUrl);
  const headers = new Headers(response.headers);
  new Headers(outcome.headers).forEach((value, name) =>
    headers.set(name, value),
  );
  return new Response(outcome.head ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function toHttpResponse(
  result: OperationResult,
  requestId: string,
  requestUrl?: URL,
): Response {
  if (result.type === "data") {
    const response = Response.json(
      { data: result.data },
      { headers: { "cache-control": "no-store", "x-request-id": requestId } },
    );
    for (const cookie of result.response?.cookies ?? [])
      response.headers.append(
        "set-cookie",
        serializeResponseCookie(cookie, requestUrl),
      );
    return response;
  }
  if (result.type === "redirect")
    return new Response(null, {
      status: result.status,
      headers: {
        location: result.location,
        "cache-control": "no-store",
        "x-request-id": requestId,
      },
    });
  const headers = new Headers(result.headers);
  headers.set("x-request-id", requestId);
  if (result.type === "stream") headers.set("content-type", result.contentType);
  if (result.type === "file" && result.cache)
    for (const [name, value] of createCacheHeaders(result.cache))
      headers.set(name, value);
  return new Response(result.type === "stream" ? result.stream : result.body, {
    status: result.type === "file" ? (result.status ?? 200) : 200,
    headers,
  });
}

function failureResponse(error: FunctionFailure) {
  const requestId = error.requestId ?? crypto.randomUUID();
  const headers = new Headers(error.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-request-id", requestId);
  if (error.retryAfterMs !== undefined)
    headers.set(
      "retry-after",
      String(Math.max(1, Math.ceil(error.retryAfterMs / 1000))),
    );
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
      meta: { requestId },
    },
    { status: error.status, headers },
  );
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
) {
  return Response.json(
    { error: { code, message }, meta: { requestId } },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-request-id": requestId,
      },
    },
  );
}
