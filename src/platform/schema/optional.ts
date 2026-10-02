import type { AnySchema } from "./types";

export function isOptionalSchema(schema: AnySchema): boolean {
  return schema.node.kind === "optional" || schema.node.kind === "default";
}
