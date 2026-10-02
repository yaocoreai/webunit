import {
  isNamespaceKey,
  type NamespaceKey,
} from "../namespace/grammar";
import type { RouteSurface } from "./definition";

const surfaces = new Set<RouteSurface>([
  "public",
  "user",
  "admin",
  "webhook",
  "internal",
]);

export type ParsedRouteName = Readonly<{
  surface: RouteSurface;
  namespace: NamespaceKey;
}>;

export function parseRouteName(value: string): ParsedRouteName | undefined {
  const separator = value.indexOf(".");
  if (separator < 0) return undefined;
  const surface = value.slice(0, separator) as RouteSurface;
  const namespace = value.slice(separator + 1);
  if (
    !surfaces.has(surface) ||
    namespace.split(".").length < 3 ||
    !isNamespaceKey(namespace)
  ) return undefined;
  return Object.freeze({ surface, namespace });
}
