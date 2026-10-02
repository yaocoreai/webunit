export interface CacheStore {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: Readonly<{ expirationTtl?: number }>,
  ): Promise<void>;
  delete(key: string): Promise<void>;
}
