import { defineErrorContract, type ErrorContract } from "./error-contract";

export class ApplicationError<
  TDetails extends object | undefined = object | undefined,
> extends Error {
  readonly code: string;
  readonly kind: ErrorContract<TDetails>["kind"];
  readonly exposure: ErrorContract<TDetails>["exposure"];
  readonly safeMessage: string;
  readonly details?: TDetails;
  readonly retryAfterMs?: number;
  readonly contract: ErrorContract<TDetails>;

  constructor(
    contract: ErrorContract<TDetails>,
    options: Readonly<{
      details?: TDetails;
      retryAfterMs?: number;
      cause?: unknown;
      debugMessage?: string;
    }> = {},
  ) {
    super(
      options.debugMessage ?? contract.message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "ApplicationError";
    this.contract = contract;
    this.code = contract.code;
    this.kind = contract.kind;
    this.exposure = contract.exposure;
    this.safeMessage = contract.message;
    if (options.details !== undefined)
      this.details = validateDetails(contract, options.details);
    if (options.retryAfterMs !== undefined) {
      if (
        !Number.isSafeInteger(options.retryAfterMs) ||
        options.retryAfterMs < 0
      )
        throw new TypeError(`Invalid retryAfterMs for ${contract.code}`);
      this.retryAfterMs = options.retryAfterMs;
    }
  }
}

export function applicationError<TDetails extends object | undefined>(
  contract: ErrorContract<TDetails>,
  options: Readonly<{
    details?: TDetails;
    retryAfterMs?: number;
    cause?: unknown;
    debugMessage?: string;
  }> = {},
) {
  return new ApplicationError(contract, options);
}

export const internalErrorContract = defineErrorContract({
  code: "internal_error",
  kind: "internal",
  exposure: "internal",
  message: "Internal server error",
});

export const cancelledErrorContract = defineErrorContract({
  code: "operation_cancelled",
  kind: "cancelled",
  exposure: "internal",
  message: "Operation was cancelled",
});

export const deadlineExceededErrorContract = defineErrorContract({
  code: "deadline_exceeded",
  kind: "deadline_exceeded",
  exposure: "public",
  message: "Operation deadline exceeded",
});

export const applicationUnavailableErrorContract = defineErrorContract({
  code: "application_unavailable",
  kind: "unavailable",
  exposure: "public",
  message: "The requested capability is temporarily unavailable",
});

export const authenticationRequiredErrorContract = defineErrorContract({
  code: "unauthorized",
  kind: "unauthenticated",
  exposure: "public",
  message: "Authentication required",
});

export const rateLimitExceededErrorContract = defineErrorContract({
  code: "rate_limit_exceeded",
  kind: "resource_exhausted",
  exposure: "public",
  message: "Too many requests",
});

export const internalError = (cause?: unknown) =>
  applicationError(internalErrorContract, {
    cause,
    ...(cause instanceof Error ? { debugMessage: cause.message } : {}),
  });
export const cancelledError = (cause?: unknown) =>
  applicationError(cancelledErrorContract, { cause });
export const deadlineExceededError = (cause?: unknown) =>
  applicationError(deadlineExceededErrorContract, { cause });
export const applicationUnavailableError = (cause?: unknown) =>
  applicationError(applicationUnavailableErrorContract, { cause });
export const authenticationRequiredError = (cause?: unknown) =>
  applicationError(authenticationRequiredErrorContract, { cause });
export const rateLimitExceededError = (retryAfterMs?: number) =>
  applicationError(rateLimitExceededErrorContract, {
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
  });

function validateDetails<TDetails extends object | undefined>(
  contract: ErrorContract<TDetails>,
  details: TDetails,
): TDetails {
  if (!contract.details)
    throw new TypeError(
      `Application Error does not declare details: ${contract.code}`,
    );
  const result = contract.details.safeParse(details);
  if (!result.success)
    throw new TypeError(`Invalid Application Error details: ${contract.code}`);
  return result.data as TDetails;
}
