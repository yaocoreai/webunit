import type {
  ParseOptions,
  ParseResult,
  ValidationIssueCode,
  ValidationIssueInput,
  ValidationPathSegment,
} from "./issues";

declare const schemaInput: unique symbol;
declare const schemaOutput: unique symbol;
declare const schemaOptionalInput: unique symbol;
declare const schemaOptionalOutput: unique symbol;

export type SchemaPortability =
  | "json-schema-complete"
  | "json-schema-partial"
  | "runtime-only";

export interface Schema<TInput = unknown, TOutput = TInput> {
  readonly node: SchemaNode;
  readonly [schemaInput]?: TInput;
  readonly [schemaOutput]?: TOutput;
  safeParse(input: unknown, options?: ParseOptions): ParseResult<TOutput>;
  parse(input: unknown, options?: ParseOptions): TOutput;
  optional(): OptionalSchema<TInput, TOutput>;
  nullable(): Schema<TInput | null, TOutput | null>;
  nullish(): OptionalSchema<TInput | null, TOutput | null>;
  default(value: Exclude<TOutput, undefined>): DefaultSchema<TInput, Exclude<TOutput, undefined>>;
  normalize(extension: Normalizer<TOutput>): this;
  check(extension: Check<TOutput> | CheckFunction<TOutput>): this;
  transform<TNext>(extension: Transform<TOutput, TNext>): Schema<TInput, TNext>;
  describe(description: string): this;
}

export type AnySchema = Schema<any, any>;
export type OptionalSchema<TInput, TOutput> =
  & Schema<TInput | undefined, TOutput | undefined>
  & Readonly<{
    [schemaOptionalInput]: true;
    [schemaOptionalOutput]: true;
  }>;
export type DefaultSchema<TInput, TOutput> =
  & Schema<TInput | undefined, TOutput>
  & Readonly<{ [schemaOptionalInput]: true }>;
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;
export type InferInput<TSchema extends AnySchema> =
  TSchema extends Schema<infer TInput, any> ? TInput : never;
export type Infer<TSchema extends AnySchema> =
  TSchema extends Schema<any, infer TOutput> ? TOutput : never;

export type Shape = Readonly<Record<string, AnySchema>>;
type OptionalInputKeys<TShape extends Shape> = {
  [TKey in keyof TShape]: TShape[TKey] extends Readonly<{ [schemaOptionalInput]: true }>
    ? TKey
    : never;
}[keyof TShape];
type RequiredInputKeys<TShape extends Shape> = Exclude<
  keyof TShape,
  OptionalInputKeys<TShape>
>;
type OptionalOutputKeys<TShape extends Shape> = {
  [TKey in keyof TShape]: TShape[TKey] extends Readonly<{ [schemaOptionalOutput]: true }>
    ? TKey
    : never;
}[keyof TShape];
type RequiredOutputKeys<TShape extends Shape> = Exclude<
  keyof TShape,
  OptionalOutputKeys<TShape>
>;

export type ObjectInput<TShape extends Shape> = Readonly<
  { [TKey in RequiredInputKeys<TShape>]: InferInput<TShape[TKey]> } &
    { [TKey in OptionalInputKeys<TShape>]?: InferInput<TShape[TKey]> }
>;
export type ObjectOutput<TShape extends Shape> = Readonly<
  { [TKey in RequiredOutputKeys<TShape>]: Infer<TShape[TKey]> } &
    { [TKey in OptionalOutputKeys<TShape>]?: Infer<TShape[TKey]> }
>;

export type TupleInput<TItems extends readonly AnySchema[]> = Readonly<{
  [TIndex in keyof TItems]: InferInput<TItems[TIndex]>;
}>;
export type TupleOutput<TItems extends readonly AnySchema[]> = Readonly<{
  [TIndex in keyof TItems]: Infer<TItems[TIndex]>;
}>;

export type CheckContext = Readonly<{
  issue(issue: ValidationIssueInput): void;
}>;
export type CheckFunction<T> = (value: T, context: CheckContext) =>
  | boolean
  | void;
export type Check<T> = Readonly<{
  kind: "check";
  name: string;
  code: ValidationIssueCode;
  message: string;
  validate: CheckFunction<T>;
}>;
export type Normalizer<T> = Readonly<{
  kind: "normalizer";
  name: string;
  normalize(value: T): T;
}>;
export type Transform<TInput, TOutput> = Readonly<{
  kind: "transform";
  name: string;
  transform(value: TInput): TOutput;
}>;

export type RuntimeExtension =
  | Normalizer<unknown>
  | Check<unknown>
  | Readonly<{
      kind: "inline-check";
      name: string;
      check: CheckFunction<unknown>;
    }>
  | Transform<unknown, unknown>;

export type SchemaPipeline = Readonly<{
  normalizers: readonly Normalizer<unknown>[];
  checks: readonly (
    | Check<unknown>
    | Readonly<{
        kind: "inline-check";
        name: string;
        check: CheckFunction<unknown>;
      }>
  )[];
  transforms: readonly Transform<unknown, unknown>[];
}>;

export type BaseNode = Readonly<{
  description?: string;
  pipeline: SchemaPipeline;
}>;

export type StringFormat =
  | "email"
  | "uuid"
  | "url"
  | "hostname"
  | "date-time"
  | "date"
  | "time"
  | "locale";

export type SchemaNode =
  | (BaseNode & Readonly<{ kind: "unknown" }>)
  | (BaseNode & Readonly<{ kind: "json" }>)
  | (BaseNode & Readonly<{ kind: "never" }>)
  | (BaseNode & Readonly<{ kind: "null" }>)
  | (BaseNode & Readonly<{ kind: "boolean"; coerce?: boolean }>)
  | (BaseNode & Readonly<{ kind: "bigint" }>)
  | (BaseNode & Readonly<{
      kind: "string";
      minimumLength?: number;
      maximumLength?: number;
      exactLength?: number;
      maximumBytes?: number;
      pattern?: string;
      format?: StringFormat;
    }>)
  | (BaseNode & Readonly<{
      kind: "number" | "integer";
      coerce?: boolean;
      minimum?: number;
      exclusiveMinimum?: number;
      maximum?: number;
      exclusiveMaximum?: number;
      multipleOf?: number;
      safe?: boolean;
    }>)
  | (BaseNode & Readonly<{ kind: "literal"; value: unknown }>)
  | (BaseNode & Readonly<{ kind: "enum"; values: readonly unknown[] }>)
  | (BaseNode & Readonly<{
      kind: "array";
      item: AnySchema;
      minimumItems?: number;
      maximumItems?: number;
      unique?: boolean;
      uniqueBy?: Readonly<{
        name: string;
        select(value: unknown): unknown;
      }>;
    }>)
  | (BaseNode & Readonly<{
      kind: "tuple";
      items: readonly AnySchema[];
    }>)
  | (BaseNode & Readonly<{
      kind: "object";
      shape: Shape;
      unknownKeys: "strict" | "strip" | "passthrough" | "catchall";
      catchall?: AnySchema;
      minimumProperties?: number;
      maximumProperties?: number;
      maximumSerializedBytes?: number;
      dependentRequired?: Readonly<Record<string, readonly string[]>>;
      uniqueNormalizedKeys?: "locale";
    }>)
  | (BaseNode & Readonly<{
      kind: "record";
      key: AnySchema;
      value: AnySchema;
      minimumProperties?: number;
      maximumProperties?: number;
      maximumSerializedBytes?: number;
    }>)
  | (BaseNode & Readonly<{
      kind: "union";
      options: readonly AnySchema[];
      exclusive: boolean;
    }>)
  | (BaseNode & Readonly<{
      kind: "discriminated-union";
      discriminator: string;
      options: Readonly<Record<string, AnySchema>>;
    }>)
  | (BaseNode & Readonly<{
      kind: "lazy";
      name: string;
      get(): AnySchema;
    }>)
  | (BaseNode & Readonly<{ kind: "optional"; inner: AnySchema }>)
  | (BaseNode & Readonly<{ kind: "nullable"; inner: AnySchema }>)
  | (BaseNode & Readonly<{
      kind: "default";
      inner: AnySchema;
      value: unknown;
    }>);

export type RuntimeExtensionDescription = Readonly<{
  path: readonly ValidationPathSegment[];
  kind: "normalizer" | "check" | "transform" | "unique-by";
  name: string;
}>;
