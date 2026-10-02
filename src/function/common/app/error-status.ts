import type { ApplicationErrorKind } from "./error-contract";

export function applicationErrorStatus(kind: ApplicationErrorKind): number {
  if (kind === "invalid_argument") return 422;
  if (kind === "unauthenticated") return 401;
  if (kind === "permission_denied") return 403;
  if (kind === "not_found") return 404;
  if (kind === "conflict") return 409;
  if (kind === "failed_precondition") return 412;
  if (kind === "resource_exhausted") return 429;
  if (kind === "cancelled") return 499;
  if (kind === "deadline_exceeded") return 504;
  if (kind === "unavailable") return 503;
  return 500;
}
