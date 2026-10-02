import Redis from "ioredis";

const clients = new Map<string, Redis>();
const readiness = new WeakMap<Redis, Promise<void>>();

export async function getRedisClient(url: string): Promise<Redis> {
  const normalized = assertRedisUrl(url);
  let client = clients.get(normalized);
  if (!client) {
    client = new Redis(normalized, {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
    });
    client.on("error", () => undefined);
    clients.set(normalized, client);
  }
  if (client.status !== "ready") {
    let pending = readiness.get(client);
    if (!pending) {
      pending = client.status === "wait" ? client.connect() : waitUntilReady(client);
      readiness.set(client, pending);
      void pending.finally(() => readiness.delete(client)).catch(() => undefined);
    }
    await pending;
  }
  return client;
}

function waitUntilReady(client: Redis) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      client.off("ready", onReady);
      client.off("end", onEnd);
    };
    const onReady = () => { cleanup(); resolve(); };
    const onEnd = () => { cleanup(); reject(new Error("Redis connection ended before it became ready")); };
    client.once("ready", onReady);
    client.once("end", onEnd);
  });
}

export function assertRedisUrl(value: string): string {
  const url = new URL(value);
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('Redis URL must use redis or rediss');
  if (!url.hostname || url.hash || url.search) throw new Error('Invalid Redis URL');
  return url.toString();
}

export async function closeRedisClients(): Promise<void> {
  const active = [...clients.values()];
  clients.clear();
  await Promise.all(active.map(async (client) => {
    if (client.status === 'end') return;
    try { await client.quit(); }
    catch { client.disconnect(); }
  }));
}
