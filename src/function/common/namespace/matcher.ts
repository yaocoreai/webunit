import type { NamespaceKey } from "./grammar";

export function findLongestNamespace<T>(
  namespace: NamespaceKey,
  entries: ReadonlyMap<NamespaceKey, T>,
): T | undefined {
  let candidate = namespace;
  while (candidate) {
    const matched = entries.get(candidate);
    if (matched !== undefined) return matched;
    const separator = candidate.lastIndexOf(".");
    if (separator < 0) return undefined;
    candidate = candidate.slice(0, separator);
  }
  return undefined;
}
