import type { Schema } from "./schema";

export type ApplicationErrorKind =
  | "invalid_argument"
  | "unauthenticated"
  | "permission_denied"
  | "not_found"
  | "conflict"
  | "failed_precondition"
  | "resource_exhausted"
  | "unavailable"
  | "cancelled"
  | "deadline_exceeded"
  | "internal";

export type ErrorExposure = "public" | "authenticated" | "internal";

export type ErrorContract<TDetails extends object | undefined = undefined> = Readonly<{
  code: string;
  kind: ApplicationErrorKind;
  exposure: ErrorExposure;
  message: string;
  details?: Schema<unknown, Exclude<TDetails, undefined>>;
}>;

export function defineErrorContract<TDetails extends object | undefined = undefined>(
  contract: ErrorContract<TDetails>,
): ErrorContract<TDetails> {
  if (!/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(contract.code))
    throw new TypeError(`Invalid Application Error code: ${contract.code}`);
  if (!contract.message.trim() || contract.message.length > 256)
    throw new TypeError(`Invalid Application Error message: ${contract.code}`);
  return Object.freeze({ ...contract });
}
