import { decodeJsonRow, encodeJsonRow, type EncodedJsonRow } from './codec';
import { resolveCacheKey, type CacheKeyInput } from './key';

export type CacheSetOptions = Readonly<{
  ttlSeconds?: number;
}>;

export type CacheGetOrSetOptions = CacheSetOptions;

export const maxCacheEncodedValueBytes = 1024 * 1024;
export const maxCacheTtlSeconds = 8_000_000_000_000;
const maxCacheEncodedValueCodeUnitsWithoutMeasurement = Math.floor(maxCacheEncodedValueBytes / 3);
const cacheTextEncoder = new TextEncoder();

export type Cache = Readonly<{
  get: <TValue = unknown>(key: CacheKeyInput) => Promise<TValue | undefined>;
  set: (key: CacheKeyInput, value: unknown, options?: CacheSetOptions) => Promise<void>;
  delete: (key: CacheKeyInput) => Promise<void>;
  getOrSet: <TValue>(
    key: CacheKeyInput,
    loader: () => TValue | Promise<TValue>,
    options?: CacheGetOrSetOptions,
  ) => Promise<TValue>;
}>;

type CacheDriver = Readonly<{
  get: <TValue = unknown>(key: string) => Promise<TValue | undefined>;
  set: (key: string, record: EncodedJsonRow, options?: CacheSetOptions) => Promise<void>;
  delete: (key: string) => Promise<void>;
}>;

export function normalizeCacheTtlSeconds(ttlSeconds: number | undefined): number | undefined {
  if (ttlSeconds === undefined) return undefined;
  if (
    !Number.isSafeInteger(ttlSeconds)
    || ttlSeconds <= 0
    || ttlSeconds > maxCacheTtlSeconds
  ) {
    throw new Error(`Invalid cache ttlSeconds: ${ttlSeconds}`);
  }
  return ttlSeconds;
}

export function createCache(driver: CacheDriver): Cache {
  return {
    get: (key) => driver.get(resolveCacheKey(key)),
    set: (key, value, options = {}) => {
      const normalizedKey = resolveCacheKey(key);
      const ttlSeconds = normalizeCacheTtlSeconds(options.ttlSeconds);
      return driver.set(normalizedKey, encodeCacheValue(value), { ttlSeconds });
    },
    delete: (key) => driver.delete(resolveCacheKey(key)),
    getOrSet: async (key, loader, options = {}) => {
      const normalizedKey = resolveCacheKey(key);
      const ttlSeconds = normalizeCacheTtlSeconds(options.ttlSeconds);
      const cached = await driver.get<Awaited<ReturnType<typeof loader>>>(normalizedKey);
      if (cached !== undefined) return cached;
      const loaded = await loader();
      await driver.set(normalizedKey, encodeCacheValue(loaded), { ttlSeconds });
      return loaded;
    },
  };
}

export function assertCacheValueSize(value: unknown): void {
  encodeCacheValue(value);
}

export function decodeCacheValue(record: EncodedJsonRow, checkEncodedSize = true): unknown {
  if (checkEncodedSize) assertCacheEncodedValueSize(record.raw);
  return decodeJsonRow(record);
}

function encodeCacheValue(value: unknown): EncodedJsonRow {
  const record = encodeJsonRow(value);
  assertCacheEncodedValueSize(record.raw);
  return record;
}

function assertCacheEncodedValueSize(raw: unknown): asserts raw is string {
  if (typeof raw !== 'string') throw new Error('Invalid cache encoded value');
  if (
    raw.length > maxCacheEncodedValueBytes
    || (
      raw.length > maxCacheEncodedValueCodeUnitsWithoutMeasurement
      && cacheTextEncoder.encode(raw).byteLength > maxCacheEncodedValueBytes
    )
  ) {
    throw new Error(`Cache value exceeds max encoded bytes: ${maxCacheEncodedValueBytes}`);
  }
}
