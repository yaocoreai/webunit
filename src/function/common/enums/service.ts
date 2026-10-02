import type {
  Database,
  EnumCatalogRecord,
  EnumItem,
} from "@/function/common/capabilities/contracts";

export type { EnumItem } from "@/function/common/capabilities/contracts";

export class EnumValidationError extends Error {}
export class EnumConflictError extends Error {}

export async function listEnumCatalogs(
  database: Database,
  page: number,
  pageSize: number,
  filters: Readonly<{
    key?: string;
    version?: string;
    visibility?: "private" | "public";
  }> = {},
) {
  const key = filters.key?.trim();
  const version = filters.version?.trim();
  const conditions = [
    key ? "key like ? escape '\\'" : undefined,
    version ? "version like ? escape '\\'" : undefined,
    filters.visibility ? "visibility = ?" : undefined,
  ].filter((condition): condition is string => Boolean(condition));
  const values = [
    key ? `%${escapeLike(key)}%` : undefined,
    version ? `%${escapeLike(version)}%` : undefined,
    filters.visibility,
  ].filter((value): value is string => value !== undefined);
  const where = conditions.length ? ` where ${conditions.join(" and ")}` : "";
  const total = Number(
    (
      await database
        .prepare(`select count(*) as total from enum_catalogs${where}`)
        .bind(...values)
        .first<{ total: number }>()
    )?.total ?? 0,
  );
  const { results } = await database
    .prepare(
      `select key, version, visibility, revision, updated_at from enum_catalogs${where} order by key limit ? offset ?`,
    )
    .bind(...values, pageSize, (page - 1) * pageSize)
    .all<EnumCatalogRow>();
  return { items: results.map(toCatalogRecord), total, page, pageSize };
}

export async function listEnums(
  database: Database,
  keyInput: string,
  parent?: Readonly<{ key: string; code: string }>,
  rootsOnly = false,
  publicOnly = false,
) {
  const key = assertKey(keyInput);
  const catalog = await database
    .prepare(
      `select key, version, visibility, revision, updated_at from enum_catalogs where key = ?${publicOnly ? " and visibility = 'public'" : ""} limit 1`,
    )
    .bind(key)
    .first<EnumCatalogRow>();
  if (!catalog) return undefined;
  const query = parent
    ? database
        .prepare(
          "select item.key, item.code, item.label, item.parent_key, item.parent_code, exists(select 1 from enum_items child where child.parent_key = item.key and child.parent_code = item.code and child.status = 'active') as has_children from enum_items item where item.key = ? and item.status = ? and item.parent_key = ? and item.parent_code = ? order by item.sort_order, item.code",
        )
        .bind(key, "active", assertKey(parent.key), assertCode(parent.code))
    : rootsOnly
      ? database
          .prepare(
            "select item.key, item.code, item.label, item.parent_key, item.parent_code, exists(select 1 from enum_items child where child.parent_key = item.key and child.parent_code = item.code and child.status = 'active') as has_children from enum_items item where item.key = ? and item.status = ? and item.parent_key is null and item.parent_code is null order by item.sort_order, item.code",
          )
          .bind(key, "active")
      : database
          .prepare(
            "select item.key, item.code, item.label, item.parent_key, item.parent_code, exists(select 1 from enum_items child where child.parent_key = item.key and child.parent_code = item.code and child.status = 'active') as has_children from enum_items item where item.key = ? and item.status = ? order by item.sort_order, item.code",
          )
          .bind(key, "active");
  const { results } = await query.all<{
    key: string;
    code: string;
    label: string;
    parent_key?: string;
    parent_code?: string;
    has_children: number;
  }>();
  return {
    ...toCatalogRecord(catalog),
    items: results.map((row): EnumItem => ({
      key: row.key,
      code: row.code,
      label: row.label,
      ...(row.has_children ? { hasChildren: true } : {}),
      ...(row.parent_key && row.parent_code
        ? { parent: { key: row.parent_key, code: row.parent_code } }
        : {}),
    })),
  };
}

export async function setEnumCatalog(
  database: Database,
  input: Readonly<{
    key: string;
    version?: string;
    visibility?: "private" | "public";
    expectedRevision?: number;
    actor?: string;
  }>,
): Promise<EnumCatalogRecord> {
  const key = assertKey(input.key);
  const version =
    input.version === undefined ? undefined : assertVersion(input.version);
  const visibility =
    input.visibility === undefined
      ? undefined
      : assertVisibility(input.visibility);
  const expectedRevision = input.expectedRevision;
  if (
    expectedRevision !== undefined &&
    (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
  )
    throw new EnumValidationError("Invalid enum catalog revision");
  const existing = await database
    .prepare(
      "select key, version, visibility, revision, updated_at from enum_catalogs where key = ?",
    )
    .bind(key)
    .first<EnumCatalogRow>();
  const now = new Date().toISOString();
  if (!existing) {
    if (expectedRevision !== undefined)
      throw new EnumConflictError("Enum catalog revision conflict");
    await database
      .prepare(
        "insert into enum_catalogs (key, version, visibility, revision, updated_at, updated_by) values (?, ?, ?, 1, ?, ?)",
      )
      .bind(
        key,
        version ?? "1",
        visibility ?? "private",
        now,
        input.actor ?? "admin",
      )
      .run();
    return {
      key,
      version: version ?? "1",
      visibility: visibility ?? "private",
      revision: 1,
      updatedAt: now,
    };
  }
  if (
    expectedRevision !== undefined &&
    expectedRevision !== Number(existing.revision)
  )
    throw new EnumConflictError("Enum catalog revision conflict");
  const result = await database
    .prepare(
      "update enum_catalogs set version = ?, visibility = ?, revision = revision + 1, updated_at = ?, updated_by = ? where key = ? and revision = ?",
    )
    .bind(
      version ?? existing.version,
      visibility ?? existing.visibility,
      now,
      input.actor ?? "admin",
      key,
      existing.revision,
    )
    .run();
  if (Number(result.rowsWritten ?? 0) !== 1)
    throw new EnumConflictError("Enum catalog revision conflict");
  return {
    key,
    version: version ?? existing.version,
    visibility: visibility ?? existing.visibility,
    revision: Number(existing.revision) + 1,
    updatedAt: now,
  };
}

type EnumCatalogRow = Readonly<{
  key: string;
  version: string;
  visibility: "private" | "public";
  revision: number;
  updated_at: string | null;
}>;
function toCatalogRecord(row: EnumCatalogRow): EnumCatalogRecord {
  return {
    key: row.key,
    version: row.version,
    visibility: row.visibility,
    revision: Number(row.revision),
    updatedAt: row.updated_at,
  };
}
function assertVersion(value: string): string {
  const result = value.trim();
  if (!result || result.length > 64)
    throw new EnumValidationError("Invalid enum catalog version");
  return result;
}
function assertVisibility(value: string): "private" | "public" {
  if (value !== "private" && value !== "public")
    throw new EnumValidationError("Invalid enum catalog visibility");
  return value;
}

function assertKey(value: string): string {
  const result = value.trim();
  if (!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(result) || result.length > 64)
    throw new EnumValidationError("Invalid enum key");
  return result;
}
function assertCode(value: string): string {
  const result = value.trim();
  if (!result || result.length > 128 || result !== result.toLowerCase())
    throw new EnumValidationError("Invalid enum code");
  return result;
}
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
