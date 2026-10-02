import type { ValidationPathSegment } from "../issues";
import { isOptionalSchema } from "../optional";
import type {
  AnySchema,
  RuntimeExtensionDescription,
  SchemaNode,
  SchemaPortability,
} from "../types";
import type { JsonSchema, JsonSchemaExport } from "./types";

export function toJsonSchema(
  schema: AnySchema,
  options: Readonly<{ requireComplete?: boolean }> = {},
): JsonSchemaExport {
  const runtimeExtensions: RuntimeExtensionDescription[] = [];
  const definitions = new Map<AnySchema, string>();
  const definitionBodies = new Map<string, JsonSchema>();
  const building = new Set<AnySchema>();
  const json = exportSchema(
    schema,
    [],
    runtimeExtensions,
    definitions,
    definitionBodies,
    building,
  );
  const portability = portabilityOf(runtimeExtensions);
  if (options.requireComplete && portability !== "json-schema-complete")
    throw new TypeError(
      `Schema is not completely portable to JSON Schema: ${runtimeExtensions[0]?.name ?? portability}`,
    );
  return Object.freeze({
    schema: freezeJsonSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      ...json,
      ...(definitionBodies.size
        ? { $defs: Object.fromEntries(definitionBodies) }
        : {}),
    }),
    portability,
    runtimeExtensions: Object.freeze(runtimeExtensions),
  });
}

export function jsonSchemaDefinition(schema: AnySchema): JsonSchema {
  return toJsonSchema(schema).schema;
}

function exportSchema(
  schema: AnySchema,
  path: readonly ValidationPathSegment[],
  extensions: RuntimeExtensionDescription[],
  definitions: Map<AnySchema, string>,
  definitionBodies: Map<string, JsonSchema>,
  building: Set<AnySchema>,
): JsonSchema {
  const node = schema.node;
  collectPipeline(node, path, extensions);
  const description = node.description ? { description: node.description } : {};
  switch (node.kind) {
    case "unknown": return description;
    case "json": return {
      ...description,
      anyOf: [
        { type: "object" },
        { type: "array" },
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
      ],
    };
    case "never": return { ...description, enum: [] };
    case "null": return { ...description, type: "null" };
    case "boolean":
      if (node.coerce)
        extensions.push({ path, kind: "normalizer", name: "coerce_boolean" });
      return { ...description, type: "boolean" };
    case "bigint":
      extensions.push({ path, kind: "transform", name: "bigint" });
      return description;
    case "string":
      return {
        ...description,
        type: "string",
        ...(node.exactLength !== undefined
          ? { minLength: node.exactLength, maxLength: node.exactLength }
          : {
              ...(node.minimumLength !== undefined ? { minLength: node.minimumLength } : {}),
              ...(node.maximumLength !== undefined ? { maxLength: node.maximumLength } : {}),
            }),
        ...(node.pattern ? { pattern: node.pattern } : {}),
        ...(node.format ? { format: node.format } : {}),
        ...(node.maximumBytes !== undefined
          ? recordExtension(extensions, path, "check", "max_bytes")
          : {}),
      };
    case "number":
    case "integer":
      if (node.coerce)
        extensions.push({ path, kind: "normalizer", name: `coerce_${node.kind}` });
      if (node.safe)
        extensions.push({ path, kind: "check", name: "safe_integer" });
      return {
        ...description,
        type: node.kind,
        ...(node.minimum !== undefined ? { minimum: node.minimum } : {}),
        ...(node.exclusiveMinimum !== undefined ? { exclusiveMinimum: node.exclusiveMinimum } : {}),
        ...(node.maximum !== undefined ? { maximum: node.maximum } : {}),
        ...(node.exclusiveMaximum !== undefined ? { exclusiveMaximum: node.exclusiveMaximum } : {}),
        ...(node.multipleOf !== undefined ? { multipleOf: node.multipleOf } : {}),
      };
    case "literal": return { ...description, const: node.value };
    case "enum": return { ...description, enum: node.values };
    case "array":
      if (node.uniqueBy)
        extensions.push({ path, kind: "unique-by", name: node.uniqueBy.name });
      return {
        ...description,
        type: "array",
        items: exportSchema(node.item, [...path, 0], extensions, definitions, definitionBodies, building),
        ...(node.minimumItems !== undefined ? { minItems: node.minimumItems } : {}),
        ...(node.maximumItems !== undefined ? { maxItems: node.maximumItems } : {}),
        ...(node.unique ? { uniqueItems: true } : {}),
      };
    case "tuple":
      return {
        ...description,
        type: "array",
        prefixItems: node.items.map((item, index) =>
          exportSchema(item, [...path, index], extensions, definitions, definitionBodies, building)),
        items: false,
        minItems: node.items.length,
        maxItems: node.items.length,
      };
    case "object": {
      if (node.maximumSerializedBytes !== undefined)
        extensions.push({ path, kind: "check", name: "max_serialized_bytes" });
      if (node.uniqueNormalizedKeys)
        extensions.push({ path, kind: "check", name: "normalized_locale_keys" });
      const properties = Object.fromEntries(Object.entries(node.shape).map(
        ([key, value]) => [key, exportSchema(value, [...path, key], extensions, definitions, definitionBodies, building)],
      ));
      const required = Object.entries(node.shape)
        .filter(([, value]) => !isOptionalSchema(value))
        .map(([key]) => key);
      return {
        ...description,
        type: "object",
        properties,
        ...(required.length ? { required } : {}),
        additionalProperties: node.unknownKeys === "passthrough"
          ? true
          : node.unknownKeys === "catchall" && node.catchall
            ? exportSchema(node.catchall, [...path, "*"], extensions, definitions, definitionBodies, building)
            : false,
        ...(node.minimumProperties !== undefined ? { minProperties: node.minimumProperties } : {}),
        ...(node.maximumProperties !== undefined ? { maxProperties: node.maximumProperties } : {}),
        ...(node.dependentRequired ? { dependentRequired: node.dependentRequired } : {}),
      };
    }
    case "record":
      if (node.maximumSerializedBytes !== undefined)
        extensions.push({ path, kind: "check", name: "max_serialized_bytes" });
      return {
        ...description,
        type: "object",
        propertyNames: exportSchema(node.key, [...path, "*"], extensions, definitions, definitionBodies, building),
        additionalProperties: exportSchema(node.value, [...path, "*"], extensions, definitions, definitionBodies, building),
        ...(node.minimumProperties !== undefined ? { minProperties: node.minimumProperties } : {}),
        ...(node.maximumProperties !== undefined ? { maxProperties: node.maximumProperties } : {}),
      };
    case "union":
      return {
        ...description,
        [node.exclusive ? "oneOf" : "anyOf"]: node.options.map((option) =>
          exportSchema(option, path, extensions, definitions, definitionBodies, building)),
      };
    case "discriminated-union":
      return {
        ...description,
        oneOf: Object.values(node.options).map((option) =>
          exportSchema(option, path, extensions, definitions, definitionBodies, building)),
      };
    case "lazy": {
      const known = definitions.get(schema);
      if (known) return { $ref: `#/$defs/${known}` };
      const name = uniqueDefinitionName(node.name, definitions);
      definitions.set(schema, name);
      if (building.has(schema)) return { $ref: `#/$defs/${name}` };
      building.add(schema);
      const target = exportSchema(
        node.get(),
        path,
        extensions,
        definitions,
        definitionBodies,
        building,
      );
      definitionBodies.set(name, target);
      building.delete(schema);
      return { $ref: `#/$defs/${name}`, ...description };
    }
    case "optional":
      return { ...exportSchema(node.inner, path, extensions, definitions, definitionBodies, building), ...description };
    case "nullable":
      return {
        ...description,
        anyOf: [
          exportSchema(node.inner, path, extensions, definitions, definitionBodies, building),
          { type: "null" },
        ],
      };
    case "default":
      return {
        ...exportSchema(node.inner, path, extensions, definitions, definitionBodies, building),
        ...description,
        default: node.value,
      };
  }
}

function collectPipeline(
  node: SchemaNode,
  path: readonly ValidationPathSegment[],
  extensions: RuntimeExtensionDescription[],
) {
  for (const item of node.pipeline.normalizers)
    extensions.push({ path, kind: "normalizer", name: item.name });
  for (const item of node.pipeline.checks)
    extensions.push({ path, kind: "check", name: item.name });
  for (const item of node.pipeline.transforms)
    extensions.push({ path, kind: "transform", name: item.name });
}

function portabilityOf(extensions: readonly RuntimeExtensionDescription[]): SchemaPortability {
  return extensions.some((extension) => extension.kind === "transform")
    ? "runtime-only"
    : extensions.length
      ? "json-schema-partial"
      : "json-schema-complete";
}

function recordExtension(
  extensions: RuntimeExtensionDescription[],
  path: readonly ValidationPathSegment[],
  kind: RuntimeExtensionDescription["kind"],
  name: string,
) {
  extensions.push({ path, kind, name });
  return {};
}

function uniqueDefinitionName(name: string, definitions: Map<AnySchema, string>) {
  const used = new Set(definitions.values());
  if (!used.has(name)) return name;
  let suffix = 2;
  while (used.has(`${name}_${suffix}`)) suffix += 1;
  return `${name}_${suffix}`;
}

function freezeJsonSchema(schema: JsonSchema): JsonSchema {
  return Object.freeze({
    ...schema,
    ...(schema.properties ? {
      properties: Object.freeze(Object.fromEntries(
        Object.entries(schema.properties).map(([key, value]) => [key, freezeJsonSchema(value)]),
      )),
    } : {}),
    ...(schema.items && typeof schema.items === "object" ? { items: freezeJsonSchema(schema.items) } : {}),
    ...(schema.prefixItems ? { prefixItems: Object.freeze(schema.prefixItems.map(freezeJsonSchema)) } : {}),
    ...(typeof schema.additionalProperties === "object" ? {
      additionalProperties: freezeJsonSchema(schema.additionalProperties),
    } : {}),
    ...(schema.propertyNames ? { propertyNames: freezeJsonSchema(schema.propertyNames) } : {}),
    ...(schema.oneOf ? { oneOf: Object.freeze(schema.oneOf.map(freezeJsonSchema)) } : {}),
    ...(schema.anyOf ? { anyOf: Object.freeze(schema.anyOf.map(freezeJsonSchema)) } : {}),
    ...(schema.required ? { required: Object.freeze([...schema.required]) } : {}),
    ...(schema.enum ? { enum: Object.freeze([...schema.enum]) } : {}),
    ...(schema.$defs ? {
      $defs: Object.freeze(Object.fromEntries(
        Object.entries(schema.$defs).map(([key, value]) => [key, freezeJsonSchema(value)]),
      )),
    } : {}),
  });
}
