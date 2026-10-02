import type { RouteMiddleware } from "./definition";
import { rateLimitExceededError } from "../app/error";

export const rateLimitMiddleware: RouteMiddleware = async (
  context,
  input,
  next,
) => {
  const limiter = context.services.rateLimiter;
  if (!limiter) return next(input);
  const policy = context.route.policy?.rate;
  if (!policy)
    throw new TypeError(`Route rate policy is missing: ${context.route.name}`);
  const keyPrefix = nonEmpty(policy.bucket);
  const maxRequests = positive(policy.limit);
  const windowMs = positive(policy.windowMs);
  const client = context.requestContext.client.ipAddress ?? "unknown";
  const result = await limiter.consume({
    bucket: keyPrefix,
    key: `ip:${client}|route:${context.route.name}`,
    limit: maxRequests,
    windowMs,
  });
  if (result.enabled && !result.allowed)
    throw rateLimitExceededError(result.retryAfterSeconds * 1_000);
  return next(input);
};

function positive(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new TypeError("Invalid rate-limit policy");
  return value;
}
function nonEmpty(value: string) {
  const result = value.trim();
  if (!result) throw new TypeError("Invalid rate-limit key prefix");
  return result;
}
