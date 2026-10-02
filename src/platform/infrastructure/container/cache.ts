import { connect, isIP } from 'node:net';
import type { Socket } from 'node:net';
import { connect as connectTls } from 'node:tls';
import {
  createCache,
  decodeCacheValue,
  maxCacheEncodedValueBytes,
  type Cache,
} from '@/platform/cache/cache';

export type RedisCacheClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { ttlSeconds?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

export type RedisCacheFromUrlOptions = {
  idleTimeoutMs?: number;
  keyPrefix?: string;
  maxConnections?: number;
  timeoutMs?: number;
};

function createRedisCacheAdapter(client: RedisCacheClient, checkEncodedSize: boolean): Cache {
  return createCache({
    get: async (key) => {
      const raw = await client.get(key);
      if (raw === null) return undefined;
      try {
        return decodeCacheValue({ encoding: 'json-row', raw }, checkEncodedSize) as never;
      } catch {
        return undefined;
      }
    },
    set: async (key, record, options = {}) => {
      await client.set(key, record.raw, { ttlSeconds: options.ttlSeconds });
    },
    delete: async (key) => {
      await client.delete(key);
    },
  });
}

export function createRedisCache(client: RedisCacheClient): Cache {
  return createRedisCacheAdapter(client, true);
}

export function createRedisCacheFromUrl(url: string, options: RedisCacheFromUrlOptions = {}): Cache {
  return createRedisCacheAdapter(createRedisUrlClient(url, options), false);
}

const defaultRedisIdleTimeoutMs = 30_000;
export const defaultRedisCacheMaxConnections = 4;
export const maxRedisCacheMaxConnections = 32;
export const defaultRedisCacheTimeoutMs = 5_000;
export const minRedisCacheTimeoutMs = 100;
export const maxRedisCacheTimeoutMs = 60_000;
const maxRedisCacheReplyBytes = maxCacheEncodedValueBytes + 1024;
const strictUtf8Decoder = new TextDecoder('utf-8', { fatal: true });

function createRedisUrlClient(url: string, options: RedisCacheFromUrlOptions): RedisCacheClient {
  const endpoint = parseRedisUrl(url);
  const idleTimeoutMs = options.idleTimeoutMs ?? defaultRedisIdleTimeoutMs;
  const keyPrefix = options.keyPrefix ?? '';
  const maxConnections = normalizeRedisCacheMaxConnections(options.maxConnections);
  const timeoutMs = normalizeRedisCacheTimeoutMs(options.timeoutMs);
  const connections: RedisConnection[] = [];

  async function sendCommand(command: readonly string[]): Promise<string | number | null> {
    let connection = connections.find((candidate) => candidate.pendingCommands === 0);
    if (!connection && connections.length < maxConnections) {
      connection = createRedisConnection(endpoint, idleTimeoutMs, timeoutMs);
      connections.push(connection);
    }
    const selectedConnection = connection ?? connections.reduce((leastBusy, candidate) => (
      candidate.pendingCommands < leastBusy.pendingCommands ? candidate : leastBusy
    ));
    selectedConnection.pendingCommands += 1;
    try {
      return await selectedConnection.sendCommand(command);
    } finally {
      selectedConnection.pendingCommands -= 1;
    }
  }

  return {
    get: async (key) => {
      const result = await sendCommand(['GET', `${keyPrefix}${key}`]);
      return readRedisBulkStringReply(result, 'GET');
    },
    set: async (key, value, setOptions = {}) => {
      const physicalKey = `${keyPrefix}${key}`;
      if (setOptions.ttlSeconds === undefined) {
        assertRedisOkReply(await sendCommand(['SET', physicalKey, value]), 'SET');
        return;
      }
      assertRedisOkReply(
        await sendCommand(['SET', physicalKey, value, 'EX', String(setOptions.ttlSeconds)]),
        'SET',
      );
    },
    delete: async (key) => {
      assertRedisDeleteReply(await sendCommand(['DEL', `${keyPrefix}${key}`]));
    },
  };
}

type RedisConnection = {
  pendingCommands: number;
  sendCommand: (command: readonly string[]) => Promise<string | number | null>;
};

function createRedisConnection(
  endpoint: RedisEndpoint,
  idleTimeoutMs: number,
  timeoutMs: number,
): RedisConnection {
  let socket: Socket | undefined;
  let socketPromise: Promise<Socket> | undefined;
  let commandQueue: Promise<unknown> = Promise.resolve();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const clearIdleTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = undefined;
    }
  };
  const markSocketUnavailable = (activeSocket: Socket) => {
    if (socket !== activeSocket) return;
    clearIdleTimer();
    socket = undefined;
    socketPromise = undefined;
    activeSocket.destroy();
  };
  const scheduleIdleClose = () => {
    clearIdleTimer();
    if (idleTimeoutMs <= 0) return;
    idleTimer = setTimeout(() => {
      const activeSocket = socket;
      socket = undefined;
      socketPromise = undefined;
      idleTimer = undefined;
      activeSocket?.end();
    }, idleTimeoutMs);
    idleTimer.unref?.();
  };
  const getSocket = async (): Promise<Socket> => {
    if (socket && !socket.destroyed) {
      clearIdleTimer();
      return socket;
    }
    socketPromise ??= openReadyRedisSocket(endpoint, timeoutMs, markSocketUnavailable);
    try {
      const activeSocket = await socketPromise;
      if (activeSocket.destroyed || !activeSocket.writable) {
        socketPromise = undefined;
        throw new Error('Redis connection closed before a command was sent');
      }
      socket = activeSocket;
      return activeSocket;
    } catch (error) {
      socketPromise = undefined;
      socket = undefined;
      throw error;
    }
  };

  return {
    pendingCommands: 0,
    sendCommand: (command) => {
      const run = async () => {
        const activeSocket = await getSocket();
        try {
          const reply = await sendRedisCommand(activeSocket, command, timeoutMs);
          scheduleIdleClose();
          return reply;
        } catch (error) {
          clearIdleTimer();
          activeSocket.destroy();
          socket = undefined;
          socketPromise = undefined;
          throw error;
        }
      };
      const result = commandQueue.then(run, run);
      commandQueue = result.catch(() => undefined);
      return result;
    },
  };
}

export function readRedisCacheMaxConnections(value: unknown): number | undefined {
  if (value === undefined || (typeof value === 'string' && value.trim().length === 0)) return undefined;
  const normalized = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number.parseInt(value.trim(), 10)
      : Number.NaN;
  return normalizeRedisCacheMaxConnections(normalized);
}

export function readRedisCacheTimeoutMs(value: unknown): number | undefined {
  if (value === undefined || (typeof value === 'string' && value.trim().length === 0)) return undefined;
  const normalized = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number.parseInt(value.trim(), 10)
      : Number.NaN;
  return normalizeRedisCacheTimeoutMs(normalized);
}

export function assertRedisCacheUrl(url: string): string {
  parseRedisUrl(url);
  return url;
}

function normalizeRedisCacheMaxConnections(value: number | undefined): number {
  const normalized = value ?? defaultRedisCacheMaxConnections;
  if (!Number.isSafeInteger(normalized) || normalized <= 0 || normalized > maxRedisCacheMaxConnections) {
    throw new Error(`Invalid Redis cache maxConnections: ${value}; expected 1..${maxRedisCacheMaxConnections}`);
  }
  return normalized;
}

function normalizeRedisCacheTimeoutMs(value: number | undefined): number {
  const normalized = value ?? defaultRedisCacheTimeoutMs;
  if (
    !Number.isSafeInteger(normalized)
    || normalized < minRedisCacheTimeoutMs
    || normalized > maxRedisCacheTimeoutMs
  ) {
    throw new Error(
      `Invalid Redis cache timeoutMs: ${value}; expected ${minRedisCacheTimeoutMs}..${maxRedisCacheTimeoutMs}`,
    );
  }
  return normalized;
}

type RedisEndpoint = {
  hostname: string;
  port: number;
  username?: string;
  password?: string;
  tls: boolean;
};

function parseRedisUrl(url: string): RedisEndpoint {
  const parsed = new URL(url);
  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error(`Invalid Redis cache URL protocol: ${parsed.protocol}`);
  }
  if (parsed.search || parsed.hash) {
    throw new Error('Invalid Redis cache URL: query and fragment are not supported');
  }
  if (parsed.username && !parsed.password) {
    throw new Error('Invalid Redis cache URL: username requires a password');
  }
  if (!parsed.hostname) {
    throw new Error('Invalid Redis cache URL: hostname is required');
  }
  const port = parsed.port ? Number.parseInt(parsed.port, 10) : 6379;
  if (!Number.isSafeInteger(port) || port <= 0 || port > 65535) {
    throw new Error('Invalid Redis cache URL: port must be 1..65535');
  }
  assertRedisDefaultDatabase(parsed.pathname);
  return {
    hostname: parsed.hostname,
    port,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    tls: parsed.protocol === 'rediss:',
  };
}

function assertRedisDefaultDatabase(pathname: string): void {
  const normalized = pathname.replace(/^\//, '').trim();
  if (normalized.length === 0 || normalized === '0') return;
  throw new Error(`Invalid Redis cache URL database: ${pathname}; only database 0 is supported`);
}

function openRedisSocket(
  endpoint: RedisEndpoint,
  timeoutMs: number,
  onUnavailable: (socket: Socket) => void,
): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = endpoint.tls
      ? connectTls({
          host: endpoint.hostname,
          port: endpoint.port,
          ...(isIP(endpoint.hostname) === 0 ? { servername: endpoint.hostname } : {}),
        })
      : connect({ host: endpoint.hostname, port: endpoint.port });
    const readyEvent = endpoint.tls ? 'secureConnect' : 'connect';
    const timeout = setTimeout(() => {
      cleanup();
      socket.destroy();
      reject(createRedisCacheTimeoutError(timeoutMs));
    }, timeoutMs);
    const onError = (error: Error) => {
      cleanup();
      socket.destroy();
      reject(error);
    };
    const onClose = () => {
      cleanup();
      reject(new Error('Redis connection closed before it was ready'));
    };
    const onReady = () => {
      cleanup();
      socket.on('error', () => onUnavailable(socket));
      socket.once('end', () => onUnavailable(socket));
      socket.once('close', () => onUnavailable(socket));
      resolve(socket);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off(readyEvent, onReady);
      socket.off('error', onError);
      socket.off('close', onClose);
    };
    socket.once(readyEvent, onReady);
    socket.once('error', onError);
    socket.once('close', onClose);
  });
}

async function openReadyRedisSocket(
  endpoint: RedisEndpoint,
  timeoutMs: number,
  onUnavailable: (socket: Socket) => void,
): Promise<Socket> {
  const socket = await openRedisSocket(endpoint, timeoutMs, onUnavailable);
  try {
    if (endpoint.password) {
      assertRedisOkReply(
        await sendRedisCommand(
          socket,
          endpoint.username
            ? ['AUTH', endpoint.username, endpoint.password]
            : ['AUTH', endpoint.password],
          timeoutMs,
        ),
        'AUTH',
      );
    }
    return socket;
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

function encodeRedisCommand(command: readonly string[]): string {
  return [
    `*${command.length}`,
    ...command.flatMap((part) => [`$${Buffer.byteLength(part)}`, part]),
    '',
  ].join('\r\n');
}

function sendRedisCommand(
  socket: Socket,
  command: readonly string[],
  timeoutMs: number,
): Promise<string | number | null> {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timeout = setTimeout(() => fail(createRedisCacheTimeoutError(timeoutMs)), timeoutMs);
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('end', onEnd);
      socket.off('close', onClose);
    };
    const fail = (error: unknown) => {
      cleanup();
      reject(error);
    };
    const onError = (error: Error) => fail(error);
    const onEnd = () => fail(new Error('Redis connection ended before a complete reply'));
    const onClose = () => fail(new Error('Redis connection closed before a complete reply'));
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        if (buffer.length > maxRedisCacheReplyBytes) {
          throw new Error(`Redis cache reply exceeds max bytes: ${maxRedisCacheReplyBytes}`);
        }
        const reply = parseRedisReply(buffer);
        if (!reply.complete) return;
        cleanup();
        resolve(reply.value);
      } catch (error) {
        fail(error);
      }
    };
    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('end', onEnd);
    socket.once('close', onClose);
    try {
      socket.write(encodeRedisCommand(command), (error) => {
        if (error) fail(error);
      });
    } catch (error) {
      fail(error);
    }
  });
}

function createRedisCacheTimeoutError(timeoutMs: number): Error {
  return new Error(`Redis cache operation timed out after ${timeoutMs}ms`);
}

function readRedisBulkStringReply(
  value: string | number | null,
  command: 'GET',
): string | null {
  if (value === null || typeof value === 'string') return value;
  throw new Error(`Unexpected Redis ${command} reply`);
}

function assertRedisOkReply(
  value: string | number | null,
  command: 'AUTH' | 'SET',
): void {
  if (value !== 'OK') throw new Error(`Unexpected Redis ${command} reply`);
}

function assertRedisDeleteReply(value: string | number | null): void {
  if (value !== 0 && value !== 1) throw new Error('Unexpected Redis DEL reply');
}

function parseRedisReply(buffer: Buffer): { complete: boolean; value: string | number | null } {
  const prefix = buffer.toString('utf8', 0, 1);
  const lineEnd = buffer.indexOf('\r\n');
  if (lineEnd < 0) return { complete: false, value: null };
  const line = buffer.toString('utf8', 1, lineEnd);
  if (prefix === '+') {
    assertCompleteRedisReply(buffer, lineEnd + 2);
    return { complete: true, value: line };
  }
  if (prefix === ':') {
    const value = parseRedisInteger(line, 'integer');
    assertCompleteRedisReply(buffer, lineEnd + 2);
    return { complete: true, value };
  }
  if (prefix === '-') throw new Error(`Redis error: ${line}`);
  if (prefix !== '$') throw new Error(`Unsupported Redis reply: ${prefix}`);
  const length = parseRedisInteger(line, 'bulk length');
  if (length === -1) {
    assertCompleteRedisReply(buffer, lineEnd + 2);
    return { complete: true, value: null };
  }
  if (length < 0) throw new Error(`Invalid Redis bulk length: ${line}`);
  if (length > maxCacheEncodedValueBytes) {
    throw new Error(`Redis bulk reply exceeds max encoded bytes: ${maxCacheEncodedValueBytes}`);
  }
  const start = lineEnd + 2;
  const end = start + length;
  if (buffer.length < end + 2) return { complete: false, value: null };
  if (buffer[end] !== 13 || buffer[end + 1] !== 10) {
    throw new Error('Invalid Redis bulk reply terminator');
  }
  assertCompleteRedisReply(buffer, end + 2);
  return { complete: true, value: strictUtf8Decoder.decode(buffer.subarray(start, end)) };
}

function parseRedisInteger(value: string, label: string): number {
  if (!/^-?\d+$/.test(value)) throw new Error(`Invalid Redis ${label}: ${value}`);
  const normalized = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(normalized)) throw new Error(`Invalid Redis ${label}: ${value}`);
  return normalized;
}

function assertCompleteRedisReply(buffer: Buffer, consumedBytes: number): void {
  if (buffer.length !== consumedBytes) throw new Error('Unexpected trailing Redis reply data');
}
