export type NamespaceKey = string;

const segmentPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const keyPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*)*$/;

export function isNamespaceSegment(value: string): boolean {
  return segmentPattern.test(value);
}

export function assertNamespaceSegment(
  value: string,
  label = "Namespace segment",
): asserts value is NamespaceKey {
  if (!isNamespaceSegment(value)) throw new TypeError(`Invalid ${label}: ${value}`);
}

export function isNamespaceKey(value: string): boolean {
  return keyPattern.test(value);
}

export function assertNamespaceKey(
  value: string,
  label = "Namespace key",
): asserts value is NamespaceKey {
  if (!isNamespaceKey(value)) throw new TypeError(`Invalid ${label}: ${value}`);
}

export function splitNamespace(value: NamespaceKey): readonly string[] {
  assertNamespaceKey(value);
  return Object.freeze(value.split("."));
}

export function namespaceBelongsTo(
  namespace: NamespaceKey,
  owner: NamespaceKey,
): boolean {
  return namespace.startsWith(`${owner}.`);
}
