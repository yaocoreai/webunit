import { asRecord } from './value';

export type ContentReference = { kind: string; id: string };

export function readReference(value: unknown): ContentReference | undefined {
  const reference = asRecord(value);
  if (!reference || typeof reference.kind !== 'string' || typeof reference.id !== 'string') return undefined;
  return { kind: reference.kind, id: reference.id };
}

export function resolveReference<T>(map: Record<string, T> | undefined, value: unknown): T | undefined {
  const reference = readReference(value);
  return reference && map ? map[reference.id] : undefined;
}

/** Resolve a `{ kind, id }` setting envelope against payload `refs[kind]`. */
export function resolvePayloadReference<T>(refs: Record<string, unknown[]>, value: unknown): T | undefined {
  const reference = readReference(value);
  if (!reference) return undefined;
  return refs[reference.kind]?.find((item) => asRecord(item)?.id === reference.id) as T | undefined;
}
