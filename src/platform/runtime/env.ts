export type EnvSource = Readonly<Record<string, unknown>>;
export type EnvParser<T> = (value: unknown, key: string) => T;
export type EnvOptions<T> = Readonly<{ parse: EnvParser<T> }>;

export interface EnvReader {
  (key: string): string | undefined;
  (key: string, defaultValue: string): string;
  <T>(key: string, defaultValue: T, options: EnvOptions<T>): T;
  <T>(key: string, defaultValue: T | undefined, options: EnvOptions<T>): T | undefined;
}

export function createEnv(source: EnvSource): EnvReader {
  return ((key: string, defaultValue?: unknown, options?: EnvOptions<unknown>) => {
    const rawValue = source[key];
    const value = typeof rawValue === 'string'
      ? rawValue.trim() || defaultValue
      : rawValue ?? defaultValue;

    if (value === undefined) return undefined;

    try {
      if (options?.parse) return options.parse(value, key);
      if (typeof value !== 'string') throw new Error('must be a string');
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid environment variable ${key}: ${message}`, { cause: error });
    }
  }) as EnvReader;
}
