export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonRecord : undefined;
}

export function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function readArray<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
  return Array.isArray(value) ? value.filter(guard) : [];
}
