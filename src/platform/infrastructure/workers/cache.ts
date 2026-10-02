import {
  createCache,
  decodeCacheValue,
  type Cache,
} from '@/platform/cache/cache';

export type KvCacheBinding = Readonly<{
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, options?: Readonly<{ expirationTtl?: number }>) => Promise<void>;
  delete: (key: string) => Promise<void>;
}>;

const cloudflareKvMinExpirationTtlSeconds = 60;

type KvCacheRecord = {
  encoding: 'json-row';
  raw: string;
  expiresAt?: number;
};

export function createKvCache(binding: KvCacheBinding): Cache {
  return createCache({
    get: async (key) => {
      const serialized = await binding.get(key);
      if (serialized === null) return undefined;
      try {
        const record = readKvCacheRecord(serialized);
        if (readKvCacheExpiresAt(record) <= Date.now()) {
          return undefined;
        }
        return decodeCacheValue(record) as never;
      } catch {
        return undefined;
      }
    },
    set: async (key, record, options = {}) => {
      const cacheRecord: KvCacheRecord = {
        ...record,
        ...(options.ttlSeconds === undefined
          ? {}
          : { expiresAt: Date.now() + options.ttlSeconds * 1000 }),
      };
      await binding.put(key, JSON.stringify(cacheRecord), {
        expirationTtl: options.ttlSeconds === undefined
          ? undefined
          : Math.max(options.ttlSeconds, cloudflareKvMinExpirationTtlSeconds),
      });
    },
    delete: async (key) => {
      await binding.delete(key);
    },
  });
}

function readKvCacheRecord(serialized: string): KvCacheRecord {
  const record = JSON.parse(serialized) as KvCacheRecord;
  if (record.expiresAt !== undefined && !Number.isSafeInteger(record.expiresAt)) {
    throw new Error('Invalid KV cache record');
  }
  return record;
}

function readKvCacheExpiresAt(record: KvCacheRecord): number {
  return record.expiresAt ?? Number.POSITIVE_INFINITY;
}

export function isKvCacheBinding(value: unknown): value is KvCacheBinding {
  return Boolean(
    value
      && typeof value === 'object'
      && 'get' in value
      && typeof value.get === 'function'
      && 'put' in value
      && typeof value.put === 'function'
      && 'delete' in value
      && typeof value.delete === 'function',
  );
}
