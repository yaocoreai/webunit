export type ValidationPathSegment = string | number;

export const validationIssueCodes = Object.freeze([
  "required",
  "invalid_type",
  "invalid_literal",
  "invalid_enum",
  "invalid_format",
  "invalid_value",
  "unknown_field",
  "too_small",
  "too_large",
  "too_short",
  "too_long",
  "too_few_items",
  "too_many_items",
  "duplicate_item",
  "duplicate_key",
  "invalid_union",
  "maximum_depth",
  "cyclic_value",
] as const);

export type ValidationIssueCode = typeof validationIssueCodes[number];

export type ValidationIssueParameter = string | number | boolean;

export type ValidationIssue = Readonly<{
  code: ValidationIssueCode;
  path: readonly ValidationPathSegment[];
  rule?: string;
  message: string;
  params?: Readonly<Record<string, ValidationIssueParameter>>;
}>;

export type ValidationIssueInput = Readonly<{
  code?: ValidationIssueCode;
  path?: readonly ValidationPathSegment[];
  rule?: string;
  message: string;
  params?: Readonly<Record<string, ValidationIssueParameter>>;
}>;

export type ParseResult<T> =
  | Readonly<{ success: true; data: T }>
  | Readonly<{ success: false; issues: readonly ValidationIssue[] }>;

export type ParseOptions = Readonly<{
  abortEarly?: boolean;
  maximumIssues?: number;
  maximumDepth?: number;
}>;

export class SchemaParseError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super("Value does not satisfy the Schema");
    this.name = "SchemaParseError";
    this.issues = issues;
  }
}
