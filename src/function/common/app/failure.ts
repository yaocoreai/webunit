import { applicationErrorStatus } from "./error-status";
import { ApplicationError } from "./error";
import type { ApplicationErrorKind } from "./error-contract";

const maximumDetailsBytes = 8 * 1024;

export class FunctionFailure extends Error {
  readonly status: number;
  readonly code: string;
  readonly kind: ApplicationErrorKind;
  readonly details?: unknown;
  readonly retryAfterMs?: number;
  readonly requestId?: string;
  readonly headers?: HeadersInit;

  constructor(input: Readonly<{
    status: number;
    code: string;
    kind: ApplicationErrorKind;
    message: string;
    details?: unknown;
    retryAfterMs?: number;
    requestId?: string;
    headers?: HeadersInit;
    cause?: unknown;
  }>) {
    super(
      input.message,
      input.cause === undefined ? undefined : { cause: input.cause },
    );
    this.name = "FunctionFailure";
    this.status = input.status;
    this.code = input.code;
    this.kind = input.kind;
    if (input.details !== undefined) this.details = input.details;
    if (input.retryAfterMs !== undefined)
      this.retryAfterMs = input.retryAfterMs;
    if (input.requestId !== undefined) this.requestId = input.requestId;
    if (input.headers !== undefined) this.headers = input.headers;
  }
}

export class RouteFailure extends FunctionFailure {
  constructor(input: ConstructorParameters<typeof FunctionFailure>[0]) {
    super(input);
    this.name = "RouteFailure";
  }
}

export function resolveRouteFailure(
  error: unknown,
  authenticated: boolean,
): RouteFailure {
  const normalized =
    error instanceof ApplicationError
      ? error
      : new ApplicationError(
          {
            code: "internal_error",
            kind: "internal",
            exposure: "internal",
            message: "Internal server error",
          },
          { cause: error },
        );
  const exposed =
    normalized.exposure === "public" ||
    (normalized.exposure === "authenticated" && authenticated);
  return new RouteFailure({
    status: exposed ? applicationErrorStatus(normalized.kind) : 500,
    code: exposed ? normalized.code : "internal_error",
    kind: exposed ? normalized.kind : "internal",
    message: exposed ? normalized.safeMessage : "Internal server error",
    ...(exposed && normalized.details !== undefined
      ? { details: safeDetails(normalized.details) }
      : {}),
    ...(normalized.retryAfterMs !== undefined
      ? { retryAfterMs: normalized.retryAfterMs }
      : {}),
    cause: error,
  });
}

function safeDetails(value: unknown) {
  try {
    const serialized = JSON.stringify(value);
    if (new TextEncoder().encode(serialized).byteLength > maximumDetailsBytes)
      return undefined;
    return JSON.parse(serialized) as unknown;
  } catch {
    return undefined;
  }
}
