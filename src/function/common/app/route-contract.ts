import {
  applicationUnavailableErrorContract,
  authenticationRequiredErrorContract,
} from "@/function/common/app/error";
import {
  defineRouteContract,
  validationFailed,
  type RouteContract,
} from "@/function/common/app/operation";
import type { ErrorContract } from "@/function/common/app/error-contract";
import { s, type AnySchema } from "@/function/common/app/schema";

export const emptyRouteInputSchema = s.object({});

export function defineAuthenticatedRouteContract<
  const TInput extends AnySchema,
  const TOutput extends AnySchema,
>(input: TInput, errors: readonly ErrorContract<any>[], output: TOutput): RouteContract<TInput, TOutput>;

export function defineAuthenticatedRouteContract(
  input: AnySchema,
  errors: readonly ErrorContract<any>[],
  output: AnySchema,
): RouteContract {
  return defineRouteContract({
    input,
    output,
    errors: [
      validationFailed,
      authenticationRequiredErrorContract,
      applicationUnavailableErrorContract,
      ...errors,
    ],
  });
}

export function definePublicRouteContract<
  const TInput extends AnySchema,
  const TOutput extends AnySchema,
>(input: TInput, errors: readonly ErrorContract<any>[], output: TOutput): RouteContract<TInput, TOutput>;

export function definePublicRouteContract(
  input: AnySchema,
  errors: readonly ErrorContract<any>[],
  output: AnySchema,
): RouteContract {
  return defineRouteContract({
    input,
    output,
    errors: [validationFailed, applicationUnavailableErrorContract, ...errors],
  });
}
