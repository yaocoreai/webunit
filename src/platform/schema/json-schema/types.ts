import type { RuntimeExtensionDescription, SchemaPortability } from "../types";

export type JsonSchemaType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null";

export type JsonSchema = Readonly<{
  $schema?: string;
  $ref?: string;
  $defs?: Readonly<Record<string, JsonSchema>>;
  type?: JsonSchemaType | readonly JsonSchemaType[];
  properties?: Readonly<Record<string, JsonSchema>>;
  items?: JsonSchema | false;
  prefixItems?: readonly JsonSchema[];
  required?: readonly string[];
  additionalProperties?: boolean | JsonSchema;
  enum?: readonly unknown[];
  const?: unknown;
  format?: string;
  description?: string;
  oneOf?: readonly JsonSchema[];
  anyOf?: readonly JsonSchema[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  propertyNames?: JsonSchema;
  dependentRequired?: Readonly<Record<string, readonly string[]>>;
  pattern?: string;
  default?: unknown;
}>;

export type JsonSchemaExport = Readonly<{
  schema: JsonSchema;
  portability: SchemaPortability;
  runtimeExtensions: readonly RuntimeExtensionDescription[];
}>;
