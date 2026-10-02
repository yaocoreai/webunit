import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  createCache,
  decodeCacheValue,
  type Cache,
} from '@/platform/cache/cache';
import { resolveCacheKey, type CacheKeyInput } from '@/platform/cache/key';

type FileCacheRecord = Readonly<{
  encoding: 'json-row';
  raw: string;
  expiresAt?: number;
}>;

export type FileCacheOptions = Readonly<{
  cleanupIntervalMs?: number;
}>;

const defaultFileCacheCleanupIntervalMs = 60_000;
const staleFileCacheOperationMs = 5 * 60_000;

export function createFileCache(rootDir: string, options: FileCacheOptions = {}): Cache {
  const cleanupIntervalMs = normalizeCleanupIntervalMs(options.cleanupIntervalMs);
  const cleanedAtByDirectory = new Map<string, number>();
  const cleaningDirectories = new Set<string>();

  const scheduleShardCleanup = (path: string) => {
    const directory = dirname(path);
    const now = Date.now();
    const cleanedAt = cleanedAtByDirectory.get(directory);
    if (cleaningDirectories.has(directory) || (cleanedAt !== undefined && now - cleanedAt < cleanupIntervalMs)) return;

    cleanedAtByDirectory.set(directory, now);
    cleaningDirectories.add(directory);
    void pruneExpiredFileCacheDirectory(directory, now)
      .catch(() => {})
      .finally(() => cleaningDirectories.delete(directory));
  };

  return createCache({
    get: async (key) => {
      const path = createResolvedFileCachePath(rootDir, key);
      const record = await readFileCacheRecord(path);
      if (!record) return undefined;

      try {
        if (readFileCacheExpiresAt(record) <= Date.now()) {
          await rm(path, { force: true });
          return undefined;
        }
        return decodeCacheValue(record, false) as never;
      } catch {
        await rm(path, { force: true });
        return undefined;
      }
    },
    set: async (key, encoded, setOptions = {}) => {
      const path = createResolvedFileCachePath(rootDir, key);
      const record: FileCacheRecord = {
        ...encoded,
        expiresAt: setOptions.ttlSeconds === undefined
          ? undefined
          : Date.now() + setOptions.ttlSeconds * 1000,
      };
      await writeFileCacheRecord(path, record);
      scheduleShardCleanup(path);
    },
    delete: async (key) => {
      await rm(createResolvedFileCachePath(rootDir, key), { force: true });
    },
  });
}

export function createFileCachePath(rootDir: string, key: CacheKeyInput): string {
  return createResolvedFileCachePath(rootDir, resolveCacheKey(key));
}

export async function pruneExpiredFileCache(rootDir: string, now = Date.now()): Promise<void> {
  let entries;
  try {
    entries = await readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) return;
    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory() && /^[a-f0-9]{2}$/.test(entry.name)) {
      await pruneExpiredFileCacheDirectory(join(rootDir, entry.name), now);
    }
  }
}

function createResolvedFileCachePath(rootDir: string, key: string): string {
  const digest = createHash('sha256').update(key).digest('hex');
  return join(rootDir, digest.slice(0, 2), `${digest}.json`);
}

async function readFileCacheRecord(path: string): Promise<FileCacheRecord | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as FileCacheRecord;
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) return undefined;
    await rm(path, { force: true });
    return undefined;
  }
}

async function writeFileCacheRecord(path: string, record: FileCacheRecord): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const tmpPath = createFileCacheTemporaryPath(path);
  try {
    await writeFile(tmpPath, JSON.stringify(record), { encoding: 'utf8', mode: 0o600 });
    await rename(tmpPath, path);
  } catch (error) {
    await rm(tmpPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function pruneExpiredFileCacheDirectory(directory: string, now: number): Promise<void> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) return;
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const path = join(directory, entry.name);
    const operationCreatedAtMs = readFileCacheOperationCreatedAt(entry.name);
    if (operationCreatedAtMs !== false) {
      await pruneStaleFileCacheOperation(path, now, operationCreatedAtMs);
      continue;
    }
    if (!entry.name.endsWith('.json')) continue;
    const record = await readFileCacheRecord(path);
    if (!record) continue;
    if (readFileCacheExpiresAt(record) <= now) await rm(path, { force: true });
  }
}

function createFileCacheTemporaryPath(path: string): string {
  return `${path}.${Date.now()}.${randomUUID()}.tmp`;
}

function readFileCacheOperationCreatedAt(name: string): number | false {
  const match = name.match(
    /^[a-f0-9]{64}\.json\.(\d+)\.[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.tmp$/,
  );
  if (!match) return false;
  const createdAtMs = Number.parseInt(match[1]!, 10);
  return Number.isSafeInteger(createdAtMs) ? createdAtMs : false;
}

async function pruneStaleFileCacheOperation(
  path: string,
  now: number,
  createdAtMs: number,
): Promise<void> {
  if (createdAtMs <= now - staleFileCacheOperationMs) await rm(path, { force: true });
}

function readFileCacheExpiresAt(record: FileCacheRecord): number {
  if (record.expiresAt === undefined) return Number.POSITIVE_INFINITY;
  return record.expiresAt;
}

function normalizeCleanupIntervalMs(value: number | undefined): number {
  const normalized = value ?? defaultFileCacheCleanupIntervalMs;
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new Error(`Invalid file cache cleanupIntervalMs: ${value}`);
  }
  return normalized;
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code);
}
