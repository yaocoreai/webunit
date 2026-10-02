import { compileSchema } from "./runtime/compile";
import {
  SchemaParseError,
  type ParseOptions,
  type ParseResult,
  type ValidationIssueCode,
} from "./issues";
import type {
  AnySchema,
  Check,
  CheckFunction,
  Infer,
  InferInput,
  JsonValue,
  Normalizer,
  ObjectInput,
  ObjectOutput,
  OptionalSchema,
  DefaultSchema,
  Schema,
  SchemaNode,
  Shape,
  Transform,
  TupleInput,
  TupleOutput,
} from "./types";

const extensionNamePattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const emptyPipeline = Object.freeze({
  normalizers: Object.freeze([]),
  checks: Object.freeze([]),
  transforms: Object.freeze([]),
});

export abstract class SchemaBuilder<TInput, TOutput>
  implements Schema<TInput, TOutput>
{
  readonly node: SchemaNode;
  declare readonly _input?: TInput;
  declare readonly _output?: TOutput;

  protected constructor(node: SchemaNode) {
    this.node = freezeNode(node);
    Object.freeze(this);
  }

  protected abstract recreate(node: SchemaNode): this;

  safeParse(input: unknown, options?: ParseOptions): ParseResult<TOutput> {
    return compileSchema(this).safeParse(input, options);
  }

  parse(input: unknown, options?: ParseOptions): TOutput {
    const result = this.safeParse(input, options);
    if (!result.success) throw new SchemaParseError(result.issues);
    return result.data;
  }

  optional(): OptionalSchema<TInput, TOutput> {
    return new GenericSchema({
      kind: "optional",
      inner: this,
      pipeline: emptyPipeline,
    }) as unknown as OptionalSchema<TInput, TOutput>;
  }

  nullable(): Schema<TInput | null, TOutput | null> {
    return new GenericSchema({
      kind: "nullable",
      inner: this,
      pipeline: emptyPipeline,
    });
  }

  nullish(): OptionalSchema<TInput | null, TOutput | null> {
    return this.nullable().optional();
  }

  default(
    value: Exclude<TOutput, undefined>,
  ): DefaultSchema<TInput, Exclude<TOutput, undefined>> {
    return new GenericSchema({
      kind: "default",
      inner: this,
      value: cloneDefault(value),
      pipeline: emptyPipeline,
    }) as unknown as DefaultSchema<TInput, Exclude<TOutput, undefined>>;
  }

  normalize(extension: Normalizer<TOutput>): this {
    assertExtensionName(extension.name);
    return this.recreate({
      ...this.node,
      pipeline: {
        ...this.node.pipeline,
        normalizers: [...this.node.pipeline.normalizers, extension as Normalizer<unknown>],
      },
    });
  }

  check(extension: Check<TOutput> | CheckFunction<TOutput>): this {
    const check = typeof extension === "function"
      ? {
          kind: "inline-check" as const,
          name: extension.name && extensionNamePattern.test(extension.name)
            ? extension.name
            : "inline_check",
          check: extension as CheckFunction<unknown>,
        }
      : extension as Check<unknown>;
    assertExtensionName(check.name);
    return this.recreate({
      ...this.node,
      pipeline: {
        ...this.node.pipeline,
        checks: [...this.node.pipeline.checks, check],
      },
    });
  }

  transform<TNext>(
    extension: Transform<TOutput, TNext>,
  ): Schema<TInput, TNext> {
    assertExtensionName(extension.name);
    return new GenericSchema({
      ...this.node,
      pipeline: {
        ...this.node.pipeline,
        transforms: [
          ...this.node.pipeline.transforms,
          extension as Transform<unknown, unknown>,
        ],
      },
    });
  }

  describe(description: string): this {
    const normalized = description.trim();
    if (!normalized) throw new TypeError("Schema description is required");
    return this.recreate({ ...this.node, description: normalized });
  }
}

export class GenericSchema<TInput, TOutput> extends SchemaBuilder<
  TInput,
  TOutput
> {
  constructor(node: SchemaNode) {
    super(node);
  }

  protected recreate(node: SchemaNode): this {
    return new GenericSchema(node) as this;
  }
}

export class StringSchema extends SchemaBuilder<string, string> {
  declare readonly node: Extract<SchemaNode, { kind: "string" }>;

  constructor(node: SchemaNode = { kind: "string", pipeline: emptyPipeline }) {
    super(node);
  }

  protected recreate(node: SchemaNode): this {
    return new StringSchema(node) as this;
  }

  trim(): this {
    return this.normalize({
      kind: "normalizer",
      name: "trim",
      normalize: (value) => value.trim(),
    });
  }

  lowercase(): this {
    return this.normalize({
      kind: "normalizer",
      name: "lowercase",
      normalize: (value) => value.toLowerCase(),
    });
  }

  uppercase(): this {
    return this.normalize({
      kind: "normalizer",
      name: "uppercase",
      normalize: (value) => value.toUpperCase(),
    });
  }

  min(minimumLength: number): this {
    nonnegativeInteger(minimumLength, "String minimum length");
    return this.recreate({ ...this.node, minimumLength });
  }

  max(maximumLength: number): this {
    nonnegativeInteger(maximumLength, "String maximum length");
    return this.recreate({ ...this.node, maximumLength });
  }

  length(exactLength: number): this {
    nonnegativeInteger(exactLength, "String length");
    return this.recreate({ ...this.node, exactLength });
  }

  maxBytes(maximumBytes: number): this {
    positiveInteger(maximumBytes, "String maximum bytes");
    return this.recreate({ ...this.node, maximumBytes });
  }

  pattern(pattern: RegExp | string): this {
    if (pattern instanceof RegExp && pattern.flags)
      throw new TypeError("Schema patterns cannot use RegExp flags");
    const source = pattern instanceof RegExp ? pattern.source : pattern;
    new RegExp(source);
    return this.recreate({ ...this.node, pattern: source });
  }

  email(): this { return this.format("email"); }
  uuid(): this { return this.format("uuid"); }
  url(): this { return this.format("url"); }
  hostname(): this { return this.format("hostname"); }
  datetime(): this { return this.format("date-time"); }
  date(): this { return this.format("date"); }
  time(): this { return this.format("time"); }
  locale(): this { return this.format("locale"); }

  private format(format: Extract<SchemaNode, { kind: "string" }>["format"]): this {
    return this.recreate({ ...this.node, format });
  }
}

export class NumberSchema extends SchemaBuilder<number, number> {
  declare readonly node: Extract<SchemaNode, { kind: "number" | "integer" }>;

  constructor(
    kind: "number" | "integer" = "number",
    node?: SchemaNode,
  ) {
    super(node ?? { kind, pipeline: emptyPipeline });
  }

  protected recreate(node: SchemaNode): this {
    return new NumberSchema(
      node.kind === "integer" ? "integer" : "number",
      node,
    ) as this;
  }

  min(minimum: number): this {
    finiteNumber(minimum, "Number minimum");
    return this.recreate({ ...this.node, minimum });
  }

  greaterThan(exclusiveMinimum: number): this {
    finiteNumber(exclusiveMinimum, "Number exclusive minimum");
    return this.recreate({ ...this.node, exclusiveMinimum });
  }

  max(maximum: number): this {
    finiteNumber(maximum, "Number maximum");
    return this.recreate({ ...this.node, maximum });
  }

  lessThan(exclusiveMaximum: number): this {
    finiteNumber(exclusiveMaximum, "Number exclusive maximum");
    return this.recreate({ ...this.node, exclusiveMaximum });
  }

  positive(): this { return this.greaterThan(0); }
  nonnegative(): this { return this.min(0); }

  multipleOf(multipleOf: number): this {
    if (!Number.isFinite(multipleOf) || multipleOf <= 0)
      throw new TypeError("Number multiple must be positive and finite");
    return this.recreate({ ...this.node, multipleOf });
  }

  safe(): this {
    return this.recreate({ ...this.node, safe: true });
  }

  finite(): this { return this; }
}

export class ArraySchema<TItem extends AnySchema> extends SchemaBuilder<
  readonly InferInput<TItem>[],
  readonly Infer<TItem>[]
> {
  declare readonly node: Extract<SchemaNode, { kind: "array" }>;

  constructor(
    item: TItem,
    node: SchemaNode = { kind: "array", item, pipeline: emptyPipeline },
  ) {
    super(node);
  }

  protected recreate(node: SchemaNode): this {
    if (node.kind !== "array") throw new TypeError("Invalid Array Schema node");
    return new ArraySchema(node.item as TItem, node) as this;
  }

  min(minimumItems: number): this {
    nonnegativeInteger(minimumItems, "Array minimum items");
    return this.recreate({ ...this.node, minimumItems });
  }

  max(maximumItems: number): this {
    nonnegativeInteger(maximumItems, "Array maximum items");
    return this.recreate({ ...this.node, maximumItems });
  }

  unique(): this {
    return this.recreate({ ...this.node, unique: true });
  }

  uniqueBy(
    name: string,
    select: (value: Infer<TItem>) => unknown,
  ): this {
    assertExtensionName(name);
    return this.recreate({
      ...this.node,
      uniqueBy: { name, select: select as (value: unknown) => unknown },
    });
  }
}

export class TupleSchema<TItems extends readonly AnySchema[]> extends SchemaBuilder<
  TupleInput<TItems>,
  TupleOutput<TItems>
> {
  declare readonly node: Extract<SchemaNode, { kind: "tuple" }>;

  constructor(
    items: TItems,
    node: SchemaNode = { kind: "tuple", items, pipeline: emptyPipeline },
  ) {
    super(node);
  }

  protected recreate(node: SchemaNode): this {
    if (node.kind !== "tuple") throw new TypeError("Invalid Tuple Schema node");
    return new TupleSchema(node.items as unknown as TItems, node) as this;
  }
}

export class ObjectSchema<TShape extends Shape> extends SchemaBuilder<
  ObjectInput<TShape>,
  ObjectOutput<TShape>
> {
  declare readonly node: Extract<SchemaNode, { kind: "object" }>;

  constructor(
    shape: TShape,
    node: SchemaNode = {
      kind: "object",
      shape,
      unknownKeys: "strict",
      pipeline: emptyPipeline,
    },
  ) {
    super(node);
  }

  protected recreate(node: SchemaNode): this {
    if (node.kind !== "object") throw new TypeError("Invalid Object Schema node");
    return new ObjectSchema(node.shape as TShape, node) as this;
  }

  strict(): this { return this.recreate({ ...this.node, unknownKeys: "strict" }); }
  strip(): this { return this.recreate({ ...this.node, unknownKeys: "strip" }); }
  passthrough(): this { return this.recreate({ ...this.node, unknownKeys: "passthrough" }); }

  catchall<TValue extends AnySchema>(schema: TValue): this {
    return this.recreate({
      ...this.node,
      unknownKeys: "catchall",
      catchall: schema,
    });
  }

  minProperties(minimumProperties: number): this {
    nonnegativeInteger(minimumProperties, "Object minimum properties");
    return this.recreate({ ...this.node, minimumProperties });
  }

  maxProperties(maximumProperties: number): this {
    nonnegativeInteger(maximumProperties, "Object maximum properties");
    return this.recreate({ ...this.node, maximumProperties });
  }

  maxSerializedBytes(maximumSerializedBytes: number): this {
    positiveInteger(maximumSerializedBytes, "Object maximum serialized bytes");
    return this.recreate({ ...this.node, maximumSerializedBytes });
  }

  requires(dependentRequired: Readonly<Record<string, readonly string[]>>): this {
    return this.recreate({ ...this.node, dependentRequired });
  }

  uniqueLocaleKeys(): this {
    return this.recreate({ ...this.node, uniqueNormalizedKeys: "locale" });
  }

  extend<const TExtension extends Shape>(
    extension: TExtension,
  ): ObjectSchema<TShape & TExtension> {
    return new ObjectSchema({ ...this.node.shape, ...extension } as TShape & TExtension, {
      ...this.node,
      shape: { ...this.node.shape, ...extension },
    });
  }

  merge<const TOther extends Shape>(
    other: ObjectSchema<TOther>,
  ): ObjectSchema<TShape & TOther> {
    const conflicts = Object.keys(other.node.kind === "object" ? other.node.shape : {})
      .filter((key) => Object.hasOwn(this.node.kind === "object" ? this.node.shape : {}, key));
    if (conflicts.length)
      throw new TypeError(`Object Schema merge conflicts: ${conflicts.join(", ")}`);
    return this.extend(other.node.kind === "object" ? other.node.shape as TOther : {} as TOther);
  }

  pick<const TKeys extends readonly (keyof TShape)[]>(
    keys: TKeys,
  ): ObjectSchema<Pick<TShape, TKeys[number]>> {
    const selected = Object.fromEntries(
      keys.map((key) => [key, this.node.shape[String(key)]]),
    ) as Pick<TShape, TKeys[number]>;
    return new ObjectSchema(selected, { ...this.node, shape: selected });
  }

  omit<const TKeys extends readonly (keyof TShape)[]>(
    keys: TKeys,
  ): ObjectSchema<Omit<TShape, TKeys[number]>> {
    const omitted = new Set<PropertyKey>(keys);
    const selected = Object.fromEntries(
      Object.entries(this.node.shape)
        .filter(([key]) => !omitted.has(key)),
    ) as Omit<TShape, TKeys[number]>;
    return new ObjectSchema(selected, { ...this.node, shape: selected });
  }

  partial(): ObjectSchema<{
    [TKey in keyof TShape]: OptionalSchema<
      InferInput<TShape[TKey]>,
      Infer<TShape[TKey]>
    >;
  }> {
    const shape = Object.fromEntries(
      Object.entries(this.node.shape)
        .map(([key, schema]) => [key, schema.optional()]),
    );
    return new ObjectSchema(shape as never, { ...this.node, shape }) as unknown as ObjectSchema<{
      [TKey in keyof TShape]: OptionalSchema<
        InferInput<TShape[TKey]>,
        Infer<TShape[TKey]>
      >;
    }>;
  }

  partialExcept<const TRequired extends readonly (keyof TShape)[]>(
    requiredKeys: TRequired,
  ): ObjectSchema<{
    [TKey in keyof TShape]: TKey extends TRequired[number]
      ? TShape[TKey]
      : OptionalSchema<InferInput<TShape[TKey]>, Infer<TShape[TKey]>>;
  }> {
    const required = new Set<PropertyKey>(requiredKeys);
    const shape = Object.fromEntries(
      Object.entries(this.node.shape)
        .map(([key, schema]) => [key, required.has(key) ? schema : schema.optional()]),
    );
    return new ObjectSchema(shape as never, { ...this.node, shape }) as unknown as ObjectSchema<{
      [TKey in keyof TShape]: TKey extends TRequired[number]
        ? TShape[TKey]
        : OptionalSchema<InferInput<TShape[TKey]>, Infer<TShape[TKey]>>;
    }>;
  }

  required(): ObjectSchema<{
    [TKey in keyof TShape]: Schema<
      Exclude<InferInput<TShape[TKey]>, undefined>,
      Exclude<Infer<TShape[TKey]>, undefined>
    >;
  }> {
    const shape = Object.fromEntries(
      Object.entries(this.node.shape)
        .map(([key, schema]) => [key, unwrapOptional(schema)]),
    );
    return new ObjectSchema(shape as never, { ...this.node, shape }) as unknown as ObjectSchema<{
      [TKey in keyof TShape]: Schema<
        Exclude<InferInput<TShape[TKey]>, undefined>,
        Exclude<Infer<TShape[TKey]>, undefined>
      >;
    }>;
  }

}

export class RecordSchema<TKey extends AnySchema, TValue extends AnySchema>
  extends SchemaBuilder<
    Readonly<Record<string, InferInput<TValue>>>,
    Readonly<Record<string, Infer<TValue>>>
  > {
  declare readonly node: Extract<SchemaNode, { kind: "record" }>;

  constructor(
    key: TKey,
    value: TValue,
    node: SchemaNode = { kind: "record", key, value, pipeline: emptyPipeline },
  ) {
    super(node);
  }

  protected recreate(node: SchemaNode): this {
    if (node.kind !== "record") throw new TypeError("Invalid Record Schema node");
    return new RecordSchema(node.key as TKey, node.value as TValue, node) as this;
  }

  minProperties(minimumProperties: number): this {
    nonnegativeInteger(minimumProperties, "Record minimum properties");
    return this.recreate({ ...this.node, minimumProperties });
  }

  maxProperties(maximumProperties: number): this {
    nonnegativeInteger(maximumProperties, "Record maximum properties");
    return this.recreate({ ...this.node, maximumProperties });
  }

  maxSerializedBytes(maximumSerializedBytes: number): this {
    positiveInteger(maximumSerializedBytes, "Record maximum serialized bytes");
    return this.recreate({ ...this.node, maximumSerializedBytes });
  }
}

export function unknownSchema() {
  return new GenericSchema<unknown, unknown>({ kind: "unknown", pipeline: emptyPipeline });
}
export function jsonSchema() {
  return new GenericSchema<JsonValue, JsonValue>({ kind: "json", pipeline: emptyPipeline });
}
export function neverSchema() {
  return new GenericSchema<never, never>({ kind: "never", pipeline: emptyPipeline });
}
export function nullSchema() {
  return new GenericSchema<null, null>({ kind: "null", pipeline: emptyPipeline });
}
export function booleanSchema(coerce = false) {
  return new GenericSchema<boolean | (typeof coerce extends true ? string : never), boolean>({
    kind: "boolean",
    coerce,
    pipeline: emptyPipeline,
  });
}
export function bigintSchema() {
  return new GenericSchema<bigint, bigint>({ kind: "bigint", pipeline: emptyPipeline });
}
export function literalSchema<const TValue>(value: TValue) {
  return new GenericSchema<TValue, TValue>({ kind: "literal", value, pipeline: emptyPipeline });
}
export function enumSchema<const TValues extends readonly unknown[]>(values: TValues) {
  if (!values.length) throw new TypeError("Enum Schema requires at least one value");
  return new GenericSchema<TValues[number], TValues[number]>({
    kind: "enum",
    values,
    pipeline: emptyPipeline,
  });
}
export function unionSchema<const TOptions extends readonly AnySchema[]>(
  options: TOptions,
  exclusive = false,
) {
  if (options.length < 2) throw new TypeError("Union Schema requires at least two options");
  return new GenericSchema<InferInput<TOptions[number]>, Infer<TOptions[number]>>({
    kind: "union",
    options,
    exclusive,
    pipeline: emptyPipeline,
  });
}
export function discriminatedUnionSchema<
  const TOptions extends Readonly<Record<string, AnySchema>>,
>(discriminator: string, options: TOptions) {
  if (!discriminator) throw new TypeError("Union discriminator is required");
  return new GenericSchema<InferInput<TOptions[keyof TOptions]>, Infer<TOptions[keyof TOptions]>>({
    kind: "discriminated-union",
    discriminator,
    options,
    pipeline: emptyPipeline,
  });
}
export function lazySchema<TInput, TOutput>(
  name: string,
  get: () => Schema<TInput, TOutput>,
) {
  assertExtensionName(name);
  return new GenericSchema<TInput, TOutput>({
    kind: "lazy",
    name,
    get,
    pipeline: emptyPipeline,
  });
}

export function normalizer<T>(definition: Omit<Normalizer<T>, "kind">): Normalizer<T> {
  assertExtensionName(definition.name);
  return Object.freeze({ kind: "normalizer", ...definition });
}
export function check<T>(definition: Readonly<{
  name: string;
  code?: ValidationIssueCode;
  message: string;
  validate: CheckFunction<T>;
}>): Check<T> {
  assertExtensionName(definition.name);
  return Object.freeze({
    kind: "check",
    code: definition.code ?? "invalid_value",
    ...definition,
  });
}
export function transform<TInput, TOutput>(
  definition: Omit<Transform<TInput, TOutput>, "kind">,
): Transform<TInput, TOutput> {
  assertExtensionName(definition.name);
  return Object.freeze({ kind: "transform", ...definition });
}

export function coerceNumber(kind: "number" | "integer") {
  return new NumberSchema(kind, { kind, coerce: true, pipeline: emptyPipeline });
}

function unwrapOptional(schema: AnySchema): AnySchema {
  return schema.node.kind === "optional" ? schema.node.inner : schema;
}

function freezeNode(node: SchemaNode): SchemaNode {
  return Object.freeze({
    ...node,
    pipeline: Object.freeze({
      normalizers: Object.freeze([...node.pipeline.normalizers]),
      checks: Object.freeze([...node.pipeline.checks]),
      transforms: Object.freeze([...node.pipeline.transforms]),
    }),
    ...(node.kind === "array" ? { uniqueBy: node.uniqueBy ? Object.freeze({ ...node.uniqueBy }) : undefined } : {}),
    ...(node.kind === "tuple" ? { items: Object.freeze([...node.items]) } : {}),
    ...(node.kind === "object" ? {
      shape: Object.freeze({ ...node.shape }),
      ...(node.dependentRequired ? {
        dependentRequired: Object.freeze(Object.fromEntries(
          Object.entries(node.dependentRequired).map(([key, values]) => [key, Object.freeze([...values])]),
        )),
      } : {}),
    } : {}),
    ...(node.kind === "union" ? { options: Object.freeze([...node.options]) } : {}),
    ...(node.kind === "discriminated-union" ? { options: Object.freeze({ ...node.options }) } : {}),
    ...(node.kind === "enum" ? { values: Object.freeze([...node.values]) } : {}),
  }) as SchemaNode;
}

function cloneDefault<T>(value: T): T {
  try {
    return deepFreeze(structuredClone(value));
  } catch (error) {
    throw new TypeError("Schema default must be structured-cloneable", { cause: error });
  }
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function assertExtensionName(name: string) {
  if (!extensionNamePattern.test(name))
    throw new TypeError(`Invalid Schema extension name: ${name}`);
}

function nonnegativeInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new TypeError(`${name} must be a non-negative safe integer`);
}
function positiveInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new TypeError(`${name} must be a positive safe integer`);
}
function finiteNumber(value: number, name: string) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}
