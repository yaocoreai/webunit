import type {
  CacheStore,
  Config,
  ConfigMutationPlan,
  ConfigRecord,
  Database,
} from "@/function/common/capabilities/contracts";
import type { JsonValue } from "@/function/common/app/schema";

export type { ConfigRecord } from "@/function/common/capabilities/contracts";

export type ConfigDependencies = Readonly<{
  getCache(): CacheStore;
  getDatabase(): Database;
}>;

export function createConfigService(dependencies: ConfigDependencies): Config {
  return {
    async list(
      input: Readonly<{
        namespace?: string;
        key?: string;
        visibility?: "private" | "public";
        page: number;
        pageSize: number;
      }>,
    ) {
      const database = dependencies.getDatabase();
      const namespace = input.namespace
        ? assertNamespace(input.namespace)
        : undefined;
      const key = input.key ? assertConfigKey(input.key) : undefined;
      const conditions = ["deleted_at is null"];
      const values: unknown[] = [];
      if (namespace) {
        conditions.push("namespace = ?");
        values.push(namespace);
      }
      if (key) {
        conditions.push("key = ?");
        values.push(key);
      }
      if (input.visibility) {
        conditions.push("visibility = ?");
        values.push(assertVisibility(input.visibility));
      }
      const where = `where ${conditions.join(" and ")}`;
      const total = Number(
        (
          await database
            .prepare(`select count(*) as total from config_records ${where}`)
            .bind(...values)
            .first<{ total: number }>()
        )?.total ?? 0,
      );
      const { results } = await database
        .prepare(
          `select namespace, key, value_raw, visibility, version, updated_at from config_records ${where} order by namespace, key limit ? offset ?`,
        )
        .bind(...values, input.pageSize, (input.page - 1) * input.pageSize)
        .all<ConfigRow>();
      return {
        items: results.map(toRecord),
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    },
    async get(
      namespaceInput: string,
      keyInput: string,
    ): Promise<ConfigRecord | undefined> {
      const namespace = assertNamespace(namespaceInput);
      const key = assertConfigKey(keyInput);
      const cacheKey = createCacheKey(namespace, key);
      const cache = dependencies.getCache();
      const cached = await cache.get(cacheKey);
      if (cached !== null && cached !== undefined)
        return JSON.parse(cached) as ConfigRecord;
      const database = dependencies.getDatabase();
      const row = await database
        .prepare(
          "select namespace, key, value_raw, visibility, version, updated_at from config_records where namespace = ? and key = ? and deleted_at is null",
        )
        .bind(namespace, key)
        .first<ConfigRow>();
      if (!row) return undefined;
      const record = toRecord(row);
      await cache.put(cacheKey, JSON.stringify(record), { expirationTtl: 300 });
      return record;
    },
    async getPublic(
      namespaceInput: string,
      keyInput: string,
    ): Promise<ConfigRecord | undefined> {
      const namespace = assertNamespace(namespaceInput);
      const key = assertConfigKey(keyInput);
      const cacheKey = createPublicCacheKey(namespace, key);
      const cache = dependencies.getCache();
      const cached = await cache.get(cacheKey);
      if (cached !== null && cached !== undefined)
        return JSON.parse(cached) as ConfigRecord;
      const row = await dependencies
        .getDatabase()
        .prepare(
          "select namespace, key, value_raw, visibility, version, updated_at from config_records where namespace = ? and key = ? and visibility = ? and deleted_at is null",
        )
        .bind(namespace, key, "public")
        .first<ConfigRow>();
      if (!row) return undefined;
      const record = toRecord(row);
      await cache.put(cacheKey, JSON.stringify(record), { expirationTtl: 300 });
      return record;
    },
    prepareSet(
      namespaceInput: string,
      keyInput: string,
      input: Readonly<{ value: unknown; visibility?: "private" | "public" }>,
      actor = "admin",
    ) {
      return prepareConfigSet(
        dependencies,
        namespaceInput,
        keyInput,
        input,
        actor,
      );
    },
    async set(
      namespaceInput: string,
      keyInput: string,
      input: Readonly<{ value: unknown; visibility?: "private" | "public" }>,
      actor = "admin",
    ): Promise<ConfigRecord> {
      const plan = await prepareConfigSet(
        dependencies,
        namespaceInput,
        keyInput,
        input,
        actor,
      );
      const results = await dependencies.getDatabase().batch(plan.statements);
      return plan.complete(results);
    },
    prepareDelete(
      namespaceInput: string,
      keyInput: string,
      actor = "admin",
    ) {
      return prepareConfigDelete(
        dependencies,
        namespaceInput,
        keyInput,
        actor,
      );
    },
    async delete(
      namespaceInput: string,
      keyInput: string,
      actor = "admin",
    ): Promise<boolean> {
      const plan = await prepareConfigDelete(
        dependencies,
        namespaceInput,
        keyInput,
        actor,
      );
      const results = await dependencies.getDatabase().batch(plan.statements);
      return plan.complete(results);
    },
  };
}

async function prepareConfigSet(
  dependencies: ConfigDependencies,
  namespaceInput: string,
  keyInput: string,
  input: Readonly<{ value: unknown; visibility?: "private" | "public" }>,
  actor: string,
): Promise<ConfigMutationPlan<ConfigRecord>> {
      const database = dependencies.getDatabase();
      const namespace = assertNamespace(namespaceInput);
      const key = assertConfigKey(keyInput);
      const raw = JSON.stringify(input.value);
      const visibility =
        input.visibility === undefined
          ? undefined
          : assertVisibility(input.visibility);
      if (
        raw === undefined ||
        new TextEncoder().encode(raw).byteLength > 1024 * 1024
      )
        throw new Error("Invalid config value");
      const now = new Date().toISOString();
      const statement = database
        .prepare(
          [
            "insert into config_records (id, namespace, key, value_raw, encoding, visibility, version, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by)",
            "values (?, ?, ?, ?, 'json-row', ?, 1, ?, ?, ?, ?, null, null)",
            "on conflict(namespace, key) do update set value_raw = excluded.value_raw, encoding = excluded.encoding, visibility = case when config_records.deleted_at is not null then excluded.visibility when ? is null then config_records.visibility else excluded.visibility end, version = config_records.version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by, deleted_at = null, deleted_by = null",
            "returning namespace, key, value_raw, visibility, version, updated_at",
          ].join(" "),
        )
        .bind(
          crypto.randomUUID(),
          namespace,
          key,
          raw,
          visibility ?? "private",
          now,
          actor,
          now,
          actor,
          visibility ?? null,
        );
      return Object.freeze({
        statements: Object.freeze([statement]),
        async complete(results) {
          const row = results[0]?.results?.[0] as ConfigRow | undefined;
          if (!row) throw new Error("Config upsert did not return a record");
          await invalidateConfigCache(dependencies, namespace, key);
          return toRecord(row);
        },
      });
}

async function prepareConfigDelete(
  dependencies: ConfigDependencies,
  namespaceInput: string,
  keyInput: string,
  actor: string,
): Promise<ConfigMutationPlan<boolean>> {
      const database = dependencies.getDatabase();
      const namespace = assertNamespace(namespaceInput);
      const key = assertConfigKey(keyInput);
      const now = new Date().toISOString();
      const statement = database
        .prepare(
          "update config_records set version = version + 1, updated_at = ?, updated_by = ?, deleted_at = ?, deleted_by = ? where namespace = ? and key = ? and deleted_at is null",
        )
        .bind(now, actor, now, actor, namespace, key);
      return Object.freeze({
        statements: Object.freeze([statement]),
        async complete(results) {
          await invalidateConfigCache(dependencies, namespace, key);
          return Boolean(results[0]?.rowsWritten);
        },
      });
}

async function invalidateConfigCache(
  dependencies: ConfigDependencies,
  namespace: string,
  key: string,
) {
  const cache = dependencies.getCache();
  await Promise.all([
    cache.delete(createCacheKey(namespace, key)),
    cache.delete(createPublicCacheKey(namespace, key)),
  ]);
}

type ConfigRow = Readonly<{
  namespace: string;
  key: string;
  value_raw: string;
  visibility: "private" | "public";
  version: number;
  updated_at: string;
}>;
function toRecord(row: ConfigRow): ConfigRecord {
  return {
    namespace: row.namespace,
    key: row.key,
    value: JSON.parse(row.value_raw) as JsonValue,
    visibility: row.visibility,
    version: Number(row.version),
    updatedAt: row.updated_at,
  };
}
function createCacheKey(namespace: string, key: string): string {
  return `config:record:${namespace}:${key}`;
}
function createPublicCacheKey(namespace: string, key: string): string {
  return `config:public:${namespace}:${key}`;
}
function assertVisibility(value: string): "private" | "public" {
  if (value !== "private" && value !== "public")
    throw new Error("Invalid config visibility");
  return value;
}
function assertNamespace(value: string): string {
  const result = value.trim();
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(result))
    throw new Error("Invalid config namespace");
  return result;
}
function assertConfigKey(value: string): string {
  const result = value.trim();
  if (
    !result ||
    result.length > 240 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result)
  )
    throw new Error("Invalid config key");
  return result;
}
