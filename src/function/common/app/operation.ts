import { ApplicationError, applicationError, internalError } from "./error";
import { defineErrorContract, type ErrorContract } from "./error-contract";
import {
  s,
  validationIssueCodes,
  type AnySchema,
  type Infer,
  type ValidationIssue,
} from "./schema";
import {
  data,
  type Operation,
  type OperationResult,
  type RouteContext,
} from "../route/definition";

export type RouteContract<
  TInputSchema extends AnySchema = AnySchema,
  TOutputSchema extends AnySchema = AnySchema,
> = Readonly<{
  input: TInputSchema;
  output: TOutputSchema;
  errors: readonly ErrorContract<any>[];
  validateOutput?: boolean;
}>;

export type ErrorMapper = (
  error: unknown,
) => ApplicationError<object | undefined> | undefined;

export function defineRouteContract<
  const TInputSchema extends AnySchema,
  const TOutputSchema extends AnySchema,
>(contract: RouteContract<TInputSchema, TOutputSchema>): RouteContract<TInputSchema, TOutputSchema> {
  const codes = contract.errors.map((error) => error.code);
  if (new Set(codes).size !== codes.length)
    throw new TypeError("Duplicate Route Contract error code");
  if (!contract.errors.includes(validationFailed))
    throw new TypeError("Route Contract must declare validation_failed");
  if (
    contract.validateOutput !== undefined &&
    typeof contract.validateOutput !== "boolean"
  ) {
    throw new TypeError("Route Contract validateOutput must be a boolean");
  }
  return Object.freeze({
    input: contract.input,
    output: contract.output,
    errors: Object.freeze([...contract.errors]),
    ...(contract.validateOutput === true ? { validateOutput: true } : {}),
  });
}

export function defineDataCommand<
  const TContract extends RouteContract,
>(definition: Readonly<{
  contract: TContract;
  mapError?: ErrorMapper;
  execute(
    context: RouteContext,
    input: Infer<TContract["input"]>,
  ): Infer<TContract["output"]> | Promise<Infer<TContract["output"]>>;
}>): Operation<unknown, Infer<TContract["output"]>> {
  return Object.freeze({
    async execute(context, rawInput) {
      const parsed = definition.contract.input.safeParse(rawInput);
      if (!parsed.success) throw validationError(parsed.issues);
      let output: Infer<TContract["output"]>;
      try {
        output = await definition.execute(
          context,
          parsed.data as Infer<TContract["input"]>,
        );
      } catch (error) {
        if (error instanceof ApplicationError)
          throw declaredError(definition.contract, error);
        const mapped = definition.mapError?.(error);
        if (mapped) throw declaredError(definition.contract, mapped);
        throw error;
      }
      return data(validateOperationOutput(definition.contract, output));
    },
  });
}

export const defineDataQuery = defineDataCommand;

export function defineResultOperation<
  const TContract extends RouteContract,
>(definition: Readonly<{
  contract: TContract;
  mapError?: ErrorMapper;
  execute(
    context: RouteContext,
    input: Infer<TContract["input"]>,
  ): OperationResult | Promise<OperationResult>;
}>): Operation<unknown, unknown> {
  return Object.freeze({
    async execute(context, rawInput) {
      const parsed = definition.contract.input.safeParse(rawInput);
      if (!parsed.success) throw validationError(parsed.issues);
      let result: OperationResult;
      try {
        result = await definition.execute(
          context,
          parsed.data as Infer<TContract["input"]>,
        );
      } catch (error) {
        if (error instanceof ApplicationError)
          throw declaredError(definition.contract, error);
        const mapped = definition.mapError?.(error);
        if (mapped) throw declaredError(definition.contract, mapped);
        throw error;
      }
      if (result.type !== "data") return result;
      return data(
        validateOperationOutput(definition.contract, result.data),
        result.response,
      );
    },
  });
}

const validationIssueSchema = s.object({
  code: s.enum(validationIssueCodes),
  path: s.array(s.union([s.string(), s.integer()])),
  rule: s.string().max(64).optional(),
  message: s.string().max(256),
  params: s.record(
    s.string().max(64),
    s.union([s.string(), s.number(), s.boolean()]),
  ).optional(),
});
const validationErrorDetailsSchema = s.object({
  type: s.literal("validation"),
  issues: s.array(validationIssueSchema).max(32),
});

export type ValidationErrorDetails = Infer<typeof validationErrorDetailsSchema>;

export const validationFailed = defineErrorContract<ValidationErrorDetails>({
  code: "validation_failed",
  kind: "invalid_argument",
  exposure: "public",
  message: "Invalid operation input",
  details: validationErrorDetailsSchema,
});

function validationError(issues: readonly ValidationIssue[]) {
  return applicationError(validationFailed, {
    details: { type: "validation", issues },
  });
}

function validateOperationOutput<TContract extends RouteContract>(
  contract: TContract,
  output: unknown,
): Infer<TContract["output"]> {
  if (contract.validateOutput !== true) {
    return output as Infer<TContract["output"]>;
  }
  const parsed = contract.output.safeParse(output);
  if (!parsed.success) {
    throw internalError(new TypeError(
      `Operation output violates its Route Contract: ${formatIssuePath(parsed.issues[0]?.path)}`,
    ));
  }
  return parsed.data as Infer<TContract["output"]>;
}

function formatIssuePath(path: readonly (string | number)[] | undefined) {
  if (!path?.length) return "root";
  return path.map((segment, index) => typeof segment === "number"
    ? `[${segment}]`
    : index === 0 ? segment : `.${segment}`).join("");
}

function declaredError(
  contract: RouteContract,
  error: ApplicationError<object | undefined>,
) {
  return contract.errors.includes(error.contract)
    ? error
    : internalError(new TypeError(`Undeclared Application Error: ${error.code}`, {
        cause: error,
      }));
}
