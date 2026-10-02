export interface ReadonlyRegistry<T> extends Iterable<readonly [string, T]> {
  readonly size: number;
  has(key: string): boolean;
  get(key: string): T | undefined;
  keys(): IterableIterator<string>;
  values(): IterableIterator<T>;
  entries(): IterableIterator<readonly [string, T]>;
}

export function createReadonlyRegistry<T>(
  entries: Iterable<readonly [string, T]>,
  label: string,
): ReadonlyRegistry<T> {
  const values = new Map<string, T>();
  for (const [key, value] of entries) {
    if (values.has(key)) throw new Error(`Duplicate ${label}: ${key}`);
    values.set(key, value);
  }
  return Object.freeze({
    get size() { return values.size; },
    has: (key: string) => values.has(key),
    get: (key: string) => values.get(key),
    keys: () => values.keys(),
    values: () => values.values(),
    entries: () => values.entries(),
    [Symbol.iterator]: () => values.entries(),
  });
}
