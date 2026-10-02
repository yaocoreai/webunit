export type SchemaTypeMode = "input" | "output";

export function schemaType(
  value: unknown,
  mode: SchemaTypeMode = "output",
): string {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return "unknown";
  const schema = value as Record<string, unknown>;
  if (Array.isArray(schema.anyOf))
    return schema.anyOf.map((item) => schemaType(item, mode)).join(" | ");
  if (Array.isArray(schema.oneOf))
    return schema.oneOf.map((item) => schemaType(item, mode)).join(" | ");
  if (Array.isArray(schema.enum))
    return (
      schema.enum.map((item) => JSON.stringify(item)).join(" | ") || "never"
    );
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (Array.isArray(schema.type))
    return schema.type
      .map((type) => schemaType({ ...schema, type }, mode))
      .join(" | ");
  switch (schema.type) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "array": {
      if (Array.isArray(schema.prefixItems)) {
        const items = schema.prefixItems.map((item) => schemaType(item, mode));
        if (schema.items === false)
          return `readonly [${items.join(", ")}]`;
        const rest = schema.items === true || schema.items === undefined
          ? "unknown"
          : schemaType(schema.items, mode);
        return `readonly [${items.join(", ")}${items.length ? ", " : ""}...${rest}[]]`;
      }
      return `readonly (${schemaType(schema.items, mode)})[]`;
    }
    case "object": {
      const properties =
        schema.properties &&
        typeof schema.properties === "object" &&
        !Array.isArray(schema.properties)
          ? (schema.properties as Record<string, unknown>)
          : {};
      const required = new Set(
        Array.isArray(schema.required) ? schema.required.map(String) : [],
      );
      const fields = Object.entries(properties).map(
        ([key, child]) =>
          `${JSON.stringify(key)}${required.has(key) ? "" : "?"}: ${schemaType(child, mode)}`,
      );
      const additional = schema.additionalProperties;
      const additionalType =
        additional && typeof additional === "object"
          ? schemaType(additional, mode)
          : undefined;
      if (!fields.length && additionalType === "unknown")
        return mode === "input"
          ? "Readonly<object>"
          : "Readonly<Record<string, unknown>>";
      if (!fields.length && additionalType)
        return `Readonly<Record<string, ${additionalType}>>`;
      if (!fields.length && additional !== false) return "Readonly<object>";
      const declared = `Readonly<{ ${fields.join("; ")} }>`;
      const openType = additional === true
        ? "unknown"
        : additionalType;
      if (openType) {
        const open = `${declared} & Readonly<Record<string, ${openType}>>`;
        return mode === "input" ? `${declared} | (${open})` : open;
      }
      return declared;
    }
    default:
      return "unknown";
  }
}
