import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CacheStore } from '@/function/common/capabilities/contracts';

type CacheRecord = Readonly<{ value: string; expiresAt?: number }>;

export function createFileCache(root: string): CacheStore {
  return {
    async get(key) {
      const path = cachePath(root, key);
      try {
        const record = JSON.parse(await readFile(path, 'utf8')) as CacheRecord;
        if (record.expiresAt !== undefined && record.expiresAt <= Date.now()) {
          await rm(path, { force: true });
          return null;
        }
        return typeof record.value === 'string' ? record.value : null;
      } catch (error) {
        if (!isMissing(error)) await rm(path, { force: true }).catch(() => {});
        return null;
      }
    },
    async put(key, value, options) {
      if (options?.expirationTtl !== undefined && (!Number.isSafeInteger(options.expirationTtl) || options.expirationTtl <= 0)) throw new Error('Invalid cache expiration TTL');
      const path = cachePath(root, key);
      const temporary = `${path}.${randomUUID()}.tmp`;
      const record: CacheRecord = { value, ...(options?.expirationTtl ? { expiresAt: Date.now() + options.expirationTtl * 1000 } : {}) };
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      try {
        await writeFile(temporary, JSON.stringify(record), { mode: 0o600 });
        await rename(temporary, path);
      } catch (error) {
        await rm(temporary, { force: true }).catch(() => {});
        throw error;
      }
    },
    delete: (key) => rm(cachePath(root, key), { force: true }),
  };
}

function cachePath(root: string, key: string): string {
  if (!key || key.length > 1024) throw new Error('Invalid cache key');
  const digest = createHash('sha256').update(key).digest('hex');
  return join(root, digest.slice(0, 2), `${digest}.json`);
}
function isMissing(error: unknown): boolean { return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'); }
