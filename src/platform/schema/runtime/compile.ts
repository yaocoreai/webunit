import type { ParseOptions, ParseResult } from "../issues";
import type {
  AnySchema,
  CheckContext,
  Infer,
  SchemaNode,
} from "../types";
import { isOptionalSchema } from "../optional";
import { matchesStringFormat } from "../formats/string-formats";
import { ParseContext } from "./context";

const invalid = Symbol("invalid-schema-value");
type Invalid = typeof invalid;
type Parser = (input: unknown, context: ParseContext) => unknown | Invalid;

export type CompiledSchema<TOutput> = Readonly<{
  safeParse(input: unknown, options?: ParseOptions): ParseResult<TOutput>;
}>;

const compiledSchemas = new WeakMap<AnySchema, CompiledSchema<unknown>>();

export function compileSchema<TSchema extends AnySchema>(
  schema: TSchema,
): CompiledSchema<Infer<TSchema>> {
  const cached = compiledSchemas.get(schema);
  if (cached) return cached as CompiledSchema<Infer<TSchema>>;
  const parser = compileNode(schema, new WeakMap());
  const compiled = Object.freeze({
    safeParse(input: unknown, options?: ParseOptions): ParseResult<Infer<TSchema>> {
      const context = new ParseContext(options);
      const value = parser(input, context);
      return context.issues.length || value === invalid
        ? { success: false, issues: Object.freeze([...context.issues]) }
        : { success: true, data: value as Infer<TSchema> };
    },
  });
  compiledSchemas.set(schema, compiled as CompiledSchema<unknown>);
  return compiled;
}

function compileNode(schema: AnySchema, local: WeakMap<AnySchema, Parser>): Parser {
  const existing = local.get(schema);
  if (existing) return existing;
  const implementation: { parser?: Parser } = {};
  const proxy: Parser = (input, context) => {
    if (!implementation.parser) throw new TypeError("Recursive Schema compiled before initialization");
    return implementation.parser(input, context);
  };
  local.set(schema, proxy);
  implementation.parser = compileNodeImplementation(schema.node, local);
  return proxy;
}

function compileNodeImplementation(node: SchemaNode, local: WeakMap<AnySchema, Parser>): Parser {
  switch (node.kind) {
    case "unknown":
      return pipeline(node, (value) => value);
    case "json":
      return pipeline(node, parseJsonValue);
    case "never":
      return (_input, context) => fail(context, {
        code: "invalid_value",
        rule: "never",
        message: "Value is not allowed",
      });
    case "null":
      return pipeline(node, (value, context) => value === null
        ? value
        : failType(context, "null"));
    case "boolean":
      return pipeline(node, (value, context) => {
        if (node.coerce && typeof value === "string") {
          if (value === "true") return true;
          if (value === "false") return false;
        }
        return typeof value === "boolean" ? value : failType(context, "a boolean");
      }, (value) => {
        if (node.coerce && value === "true") return { accepted: true, value: true };
        if (node.coerce && value === "false") return { accepted: true, value: false };
        return { accepted: typeof value === "boolean", value };
      });
    case "bigint":
      return pipeline(node, (value, context) =>
        typeof value === "bigint" ? value : failType(context, "a bigint"));
    case "string":
      return compileString(node);
    case "number":
    case "integer":
      return compileNumber(node);
    case "literal":
      return pipeline(node, (value, context) => Object.is(value, node.value)
        ? value
        : fail(context, {
            code: "invalid_literal",
            rule: "literal",
            message: "Value does not match the required literal",
          }));
    case "enum": {
      const values = new Set(node.values);
      return pipeline(node, (value, context) => values.has(value)
        ? value
        : fail(context, {
            code: "invalid_enum",
            rule: "enum",
            message: "Value is not an allowed option",
          }));
    }
    case "array":
      return compileArray(node, compileNode(node.item, local));
    case "tuple":
      return compileTuple(node, node.items.map((item) => compileNode(item, local)));
    case "object":
      return compileObject(
        node,
        new Map(Object.entries(node.shape).map(([key, value]) => [key, compileNode(value, local)])),
        node.catchall ? compileNode(node.catchall, local) : undefined,
      );
    case "record":
      return compileRecord(
        node,
        compileNode(node.key, local),
        compileNode(node.value, local),
      );
    case "union":
      return compileUnion(node, node.options.map((option) => compileNode(option, local)));
    case "discriminated-union": {
      const options = new Map(Object.entries(node.options).map(
        ([key, value]) => [key, compileNode(value, local)],
      ));
      return pipeline(node, (value, context) => {
        if (!isRecord(value)) return failType(context, "an object");
        const discriminator = value[node.discriminator];
        const selected = typeof discriminator === "string"
          ? options.get(discriminator)
          : undefined;
        if (!selected)
          return context.withPath(node.discriminator, () => fail(context, {
            code: "invalid_union",
            rule: "discriminator",
            message: "Value has an unsupported discriminator",
          }));
        return selected(value, context);
      }, (value) => ({ accepted: isRecord(value), value }));
    }
    case "lazy": {
      let resolved: Parser | undefined;
      return pipeline(node, (value, context) => {
        resolved ??= compileNode(node.get(), local);
        return resolved(value, context);
      });
    }
    case "optional": {
      const inner = compileNode(node.inner, local);
      return pipeline(node, (value, context) => value === undefined
        ? undefined
        : inner(value, context));
    }
    case "nullable": {
      const inner = compileNode(node.inner, local);
      return pipeline(node, (value, context) => value === null
        ? null
        : inner(value, context));
    }
    case "default": {
      const inner = compileNode(node.inner, local);
      return pipeline(node, (value, context) => inner(
        value === undefined ? structuredClone(node.value) : value,
        context,
      ));
    }
  }
}

function compileString(node: Extract<SchemaNode, { kind: "string" }>): Parser {
  const pattern = node.pattern ? new RegExp(node.pattern) : undefined;
  const encoder = node.maximumBytes === undefined ? undefined : new TextEncoder();
  return pipeline(node, (input, context) => {
    if (typeof input !== "string") return failType(context, "a string");
    const length = Array.from(input).length;
    if (node.exactLength !== undefined && length !== node.exactLength)
      context.issue({
        code: length < node.exactLength ? "too_short" : "too_long",
        rule: "exact_length",
        message: `Value must contain exactly ${node.exactLength} characters`,
        params: { expected: node.exactLength, actual: length },
      });
    if (node.minimumLength !== undefined && length < node.minimumLength)
      context.issue({
        code: "too_short",
        rule: "min_length",
        message: `Value must contain at least ${node.minimumLength} characters`,
        params: { minimum: node.minimumLength, actual: length },
      });
    if (node.maximumLength !== undefined && length > node.maximumLength)
      context.issue({
        code: "too_long",
        rule: "max_length",
        message: `Value must contain at most ${node.maximumLength} characters`,
        params: { maximum: node.maximumLength, actual: length },
      });
    if (encoder && node.maximumBytes !== undefined) {
      const bytes = encoder.encode(input).byteLength;
      if (bytes > node.maximumBytes)
        context.issue({
          code: "too_large",
          rule: "max_bytes",
          message: `Value must not exceed ${node.maximumBytes} bytes`,
          params: { maximum: node.maximumBytes, actual: bytes },
        });
    }
    if (pattern && !pattern.test(input))
      context.issue({
        code: "invalid_format",
        rule: "pattern",
        message: "Value has an invalid format",
      });
    if (node.format && !matchesStringFormat(node.format, input))
      context.issue({
        code: "invalid_format",
        rule: node.format.replace("-", "_"),
        message: `Value must be a valid ${node.format}`,
        params: { format: node.format },
      });
    return input;
  }, (value) => ({ accepted: typeof value === "string", value }));
}

function compileNumber(node: Extract<SchemaNode, { kind: "number" | "integer" }>): Parser {
  return pipeline(node, (raw, context) => {
    const input = node.coerce && typeof raw === "string" && raw.trim()
      ? Number(raw)
      : raw;
    if (typeof input !== "number" || !Number.isFinite(input) ||
      (node.kind === "integer" && !Number.isInteger(input)))
      return failType(context, node.kind === "integer" ? "an integer" : "a number");
    if (node.safe && !Number.isSafeInteger(input))
      context.issue({
        code: "invalid_value",
        rule: "safe_integer",
        message: "Value must be a safe integer",
      });
    if (node.minimum !== undefined && input < node.minimum)
      context.issue({
        code: "too_small",
        rule: "minimum",
        message: `Value must be at least ${node.minimum}`,
        params: { minimum: node.minimum, actual: input },
      });
    if (node.exclusiveMinimum !== undefined && input <= node.exclusiveMinimum)
      context.issue({
        code: "too_small",
        rule: "exclusive_minimum",
        message: `Value must be greater than ${node.exclusiveMinimum}`,
        params: { minimum: node.exclusiveMinimum, actual: input },
      });
    if (node.maximum !== undefined && input > node.maximum)
      context.issue({
        code: "too_large",
        rule: "maximum",
        message: `Value must be at most ${node.maximum}`,
        params: { maximum: node.maximum, actual: input },
      });
    if (node.exclusiveMaximum !== undefined && input >= node.exclusiveMaximum)
      context.issue({
        code: "too_large",
        rule: "exclusive_maximum",
        message: `Value must be less than ${node.exclusiveMaximum}`,
        params: { maximum: node.exclusiveMaximum, actual: input },
      });
    if (node.multipleOf !== undefined && !isMultipleOf(input, node.multipleOf))
      context.issue({
        code: "invalid_value",
        rule: "multiple_of",
        message: `Value must be a multiple of ${node.multipleOf}`,
        params: { multipleOf: node.multipleOf },
      });
    return input;
  }, (raw) => {
    const value = node.coerce && typeof raw === "string" && raw.trim()
      ? Number(raw)
      : raw;
    return {
      accepted: typeof value === "number" && Number.isFinite(value) &&
        (node.kind !== "integer" || Number.isInteger(value)),
      value,
    };
  });
}

function compileArray(
  node: Extract<SchemaNode, { kind: "array" }>,
  itemParser: Parser,
): Parser {
  return pipeline(node, (input, context) => {
    if (!Array.isArray(input)) return failType(context, "an array");
    if (!context.enter(input)) return invalid;
    try {
      if (node.minimumItems !== undefined && input.length < node.minimumItems)
        context.issue({
          code: "too_few_items",
          rule: "min_items",
          message: `Value must contain at least ${node.minimumItems} items`,
          params: { minimum: node.minimumItems, actual: input.length },
        });
      if (node.maximumItems !== undefined && input.length > node.maximumItems)
        context.issue({
          code: "too_many_items",
          rule: "max_items",
          message: `Value must contain at most ${node.maximumItems} items`,
          params: { maximum: node.maximumItems, actual: input.length },
        });
      if (node.unique) validateUnique(input, context, (value) => value, "unique_items");
      if (node.uniqueBy)
        validateUnique(input, context, node.uniqueBy.select, node.uniqueBy.name);
      const output: unknown[] = [];
      for (let index = 0; index < input.length && !context.stopped; index += 1) {
        const value = context.withPath(index, () => itemParser(input[index], context));
        if (value !== invalid) output.push(value);
      }
      return output;
    } finally {
      context.leave(input);
    }
  }, (value) => ({ accepted: Array.isArray(value), value }));
}

function compileTuple(
  node: Extract<SchemaNode, { kind: "tuple" }>,
  itemParsers: readonly Parser[],
): Parser {
  return pipeline(node, (input, context) => {
    if (!Array.isArray(input)) return failType(context, "an array");
    if (!context.enter(input)) return invalid;
    try {
      if (input.length !== itemParsers.length)
        context.issue({
          code: input.length < itemParsers.length ? "too_few_items" : "too_many_items",
          rule: "tuple_length",
          message: `Value must contain exactly ${itemParsers.length} items`,
          params: { expected: itemParsers.length, actual: input.length },
        });
      const output: unknown[] = [];
      for (let index = 0; index < itemParsers.length && index < input.length && !context.stopped; index += 1) {
        const value = context.withPath(index, () => itemParsers[index]!(input[index], context));
        if (value !== invalid) output[index] = value;
      }
      return output;
    } finally {
      context.leave(input);
    }
  }, (value) => ({ accepted: Array.isArray(value), value }));
}

function compileObject(
  node: Extract<SchemaNode, { kind: "object" }>,
  properties: ReadonlyMap<string, Parser>,
  catchall: Parser | undefined,
): Parser {
  const shapeEntries = Object.entries(node.shape);
  return pipeline(node, (input, context) => {
    if (!isRecord(input)) return failType(context, "an object");
    if (!context.enter(input)) return invalid;
    try {
      const keys = Object.keys(input);
      validatePropertyCount(node, keys.length, context);
      if (node.maximumSerializedBytes !== undefined)
        validateSerializedBytes(input, node.maximumSerializedBytes, context);
      if (node.uniqueNormalizedKeys === "locale")
        validateLocaleKeyUniqueness(keys, context);
      const output: Record<string, unknown> = {};
      for (const [key, schema] of shapeEntries) {
        const hasValue = Object.hasOwn(input, key);
        if (!hasValue && !isOptionalSchema(schema)) {
          context.withPath(key, () => context.issue({
            code: "required",
            rule: "required",
            message: "Value is required",
          }));
          if (context.stopped) break;
          continue;
        }
        if (!hasValue && schema.node.kind === "optional") continue;
        const parsed = context.withPath(key, () => properties.get(key)!(input[key], context));
        if (parsed !== invalid && parsed !== undefined)
          defineSafe(output, key, parsed);
        else if (parsed === undefined && hasValue)
          defineSafe(output, key, parsed);
        if (context.stopped) break;
      }
      for (const key of keys) {
        if (Object.hasOwn(node.shape, key)) continue;
        if (node.unknownKeys === "strict") {
          context.withPath(key, () => context.issue({
            code: "unknown_field",
            rule: "strict_object",
            message: "Field is not allowed",
          }));
        } else if (node.unknownKeys === "passthrough") {
          defineSafe(output, key, input[key]);
        } else if (node.unknownKeys === "catchall" && catchall) {
          const parsed = context.withPath(key, () => catchall(input[key], context));
          if (parsed !== invalid) defineSafe(output, key, parsed);
        }
        if (context.stopped) break;
      }
      for (const [key, dependencies] of Object.entries(node.dependentRequired ?? {})) {
        if (!Object.hasOwn(input, key)) continue;
        for (const dependency of dependencies) {
          if (!Object.hasOwn(input, dependency))
            context.withPath(dependency, () => context.issue({
              code: "required",
              rule: "dependent_required",
              message: `Value is required when ${key} is provided`,
              params: { dependency: key },
            }));
        }
      }
      return output;
    } finally {
      context.leave(input);
    }
  }, (value) => ({ accepted: isRecord(value), value }));
}

function compileRecord(
  node: Extract<SchemaNode, { kind: "record" }>,
  keyParser: Parser,
  valueParser: Parser,
): Parser {
  return pipeline(node, (input, context) => {
    if (!isRecord(input)) return failType(context, "an object");
    if (!context.enter(input)) return invalid;
    try {
      const entries = Object.entries(input);
      validatePropertyCount(node, entries.length, context);
      if (node.maximumSerializedBytes !== undefined)
        validateSerializedBytes(input, node.maximumSerializedBytes, context);
      const output: Record<string, unknown> = {};
      const normalizedKeys = new Set<string>();
      for (const [key, value] of entries) {
        const parsedKey = context.withPath(key, () => keyParser(key, context));
        if (parsedKey === invalid || typeof parsedKey !== "string") continue;
        if (normalizedKeys.has(parsedKey)) {
          context.withPath(key, () => context.issue({
            code: "duplicate_key",
            rule: "normalized_key",
            message: "Property name duplicates a normalized key",
          }));
          continue;
        }
        normalizedKeys.add(parsedKey);
        const parsedValue = context.withPath(key, () => valueParser(value, context));
        if (parsedValue !== invalid) defineSafe(output, parsedKey, parsedValue);
        if (context.stopped) break;
      }
      return output;
    } finally {
      context.leave(input);
    }
  }, (value) => ({ accepted: isRecord(value), value }));
}

function compileUnion(
  node: Extract<SchemaNode, { kind: "union" }>,
  parsers: readonly Parser[],
): Parser {
  return pipeline(node, (input, context) => {
    const matches: unknown[] = [];
    for (const parser of parsers) {
      const candidate = context.fork();
      const parsed = parser(input, candidate);
      if (parsed !== invalid && candidate.issues.length === 0) matches.push(parsed);
      if (!node.exclusive && matches.length) return matches[0];
    }
    if ((node.exclusive && matches.length !== 1) || matches.length === 0)
      return fail(context, {
        code: "invalid_union",
        rule: node.exclusive ? "exclusive_union" : "union",
        message: node.exclusive
          ? "Value must match exactly one allowed shape"
          : "Value must match an allowed shape",
      });
    return matches[0];
  });
}

function pipeline(
  node: SchemaNode,
  core: Parser,
  prepare?: (value: unknown) => Readonly<{ accepted: boolean; value: unknown }>,
): Parser {
  const normalizers = node.pipeline.normalizers;
  const checks = node.pipeline.checks;
  const transforms = node.pipeline.transforms;
  return (input, context) => {
    const startingIssues = context.issues.length;
    let value = input;
    const prepared = prepare?.(value);
    const normalizeBeforeCore = prepared?.accepted === true;
    if (prepared) value = prepared.value;
    if (normalizeBeforeCore)
      for (const extension of normalizers) value = extension.normalize(value);
    value = core(value, context);
    if (value === invalid) return invalid;
    if (!normalizeBeforeCore && context.issues.length === startingIssues)
      for (const extension of normalizers) value = extension.normalize(value);
    if (context.issues.length !== startingIssues) return value;
    for (const extension of checks) {
      const beforeCheck = context.issues.length;
      const checkContext: CheckContext = Object.freeze({
        issue: (issue) => context.issue(issue),
      });
      if (extension.kind === "check") {
        const passed = extension.validate(value, checkContext);
        if (passed === false && context.issues.length === beforeCheck)
          context.issue({
            code: extension.code,
            rule: extension.name,
            message: extension.message,
          });
      } else {
        const passed = extension.check(value, checkContext);
        if (passed === false && context.issues.length === beforeCheck)
          context.issue({
            code: "invalid_value",
            rule: extension.name,
            message: "Value is invalid",
          });
      }
      if (context.stopped) break;
    }
    if (context.issues.length !== startingIssues) return value;
    for (const extension of transforms) value = extension.transform(value);
    return value;
  };
}

function validatePropertyCount(
  node: Readonly<{ minimumProperties?: number; maximumProperties?: number }>,
  actual: number,
  context: ParseContext,
) {
  if (node.minimumProperties !== undefined && actual < node.minimumProperties)
    context.issue({
      code: "too_few_items",
      rule: "min_properties",
      message: `Value must contain at least ${node.minimumProperties} fields`,
      params: { minimum: node.minimumProperties, actual },
    });
  if (node.maximumProperties !== undefined && actual > node.maximumProperties)
    context.issue({
      code: "too_many_items",
      rule: "max_properties",
      message: `Value must contain at most ${node.maximumProperties} fields`,
      params: { maximum: node.maximumProperties, actual },
    });
}

function validateSerializedBytes(value: unknown, maximum: number, context: ParseContext) {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = undefined;
  }
  if (serialized === undefined) {
    context.issue({
      code: "invalid_value",
      rule: "json_serializable",
      message: "Value must be JSON serializable",
    });
    return;
  }
  const actual = new TextEncoder().encode(serialized).byteLength;
  if (actual > maximum)
    context.issue({
      code: "too_large",
      rule: "max_serialized_bytes",
      message: `Value must not exceed ${maximum} serialized bytes`,
      params: { maximum, actual },
    });
}

function validateLocaleKeyUniqueness(keys: readonly string[], context: ParseContext) {
  const normalized = new Set<string>();
  for (const key of keys) {
    let locale: string;
    try {
      locale = new Intl.Locale(key.trim().replaceAll("_", "-")).toString().toLowerCase();
    } catch {
      context.withPath(key, () => context.issue({
        code: "invalid_format",
        rule: "locale",
        message: "Property name must be a valid locale",
      }));
      continue;
    }
    if (normalized.has(locale))
      context.withPath(key, () => context.issue({
        code: "duplicate_key",
        rule: "normalized_locale",
        message: "Property name duplicates a normalized locale",
      }));
    normalized.add(locale);
  }
}

function validateUnique(
  values: readonly unknown[],
  context: ParseContext,
  select: (value: unknown) => unknown,
  rule: string,
) {
  const seen = new Set<string>();
  for (let index = 0; index < values.length; index += 1) {
    const key = stableKey(select(values[index]));
    if (key === undefined || seen.has(key)) {
      context.withPath(index, () => context.issue({
        code: "duplicate_item",
        rule,
        message: "Array items must be unique",
      }));
    } else {
      seen.add(key);
    }
  }
}

function stableKey(value: unknown): string | undefined {
  try {
    return stableJson(value, new Set());
  } catch {
    return undefined;
  }
}

function stableJson(value: unknown, seen: Set<object>): string {
  if (value && typeof value === "object") {
    if (seen.has(value)) throw new TypeError("Cyclic value");
    seen.add(value);
  }
  if (Array.isArray(value)) {
    const result = `[${value.map((item) => stableJson(item, seen)).join(",")}]`;
    seen.delete(value);
    return result;
  }
  if (value && typeof value === "object") {
    const result = `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item, seen)}`).join(",")}}`;
    seen.delete(value);
    return result;
  }
  return `${typeof value}:${JSON.stringify(value) ?? String(value)}`;
}

function defineSafe(target: Record<string, unknown>, key: string, value: unknown) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function failType(context: ParseContext, expected: string): Invalid {
  return fail(context, {
    code: "invalid_type",
    rule: "type",
    message: `Value must be ${expected}`,
  });
}

function fail(context: ParseContext, issue: Parameters<ParseContext["issue"]>[0]): Invalid {
  context.issue(issue);
  return invalid;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMultipleOf(value: number, multiple: number) {
  const quotient = value / multiple;
  return Math.abs(quotient - Math.round(quotient)) <= Number.EPSILON * 10;
}

function parseJsonValue(input: unknown, context: ParseContext): unknown | Invalid {
  if (input === null || typeof input === "string" || typeof input === "boolean")
    return input;
  if (typeof input === "number")
    return Number.isFinite(input) ? input : failType(context, "a finite JSON number");
  if (!Array.isArray(input) && !isRecord(input))
    return failType(context, "a JSON value");
  if (!context.enter(input)) return invalid;
  try {
    if (Array.isArray(input)) {
      const output: unknown[] = [];
      for (let index = 0; index < input.length && !context.stopped; index += 1) {
        const value = context.withPath(index, () => parseJsonValue(input[index], context));
        if (value !== invalid) output.push(value);
      }
      return output;
    }
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(input)) {
      const value = context.withPath(key, () => parseJsonValue(item, context));
      if (value !== invalid) defineSafe(output, key, value);
      if (context.stopped) break;
    }
    return output;
  } finally {
    context.leave(input);
  }
}
