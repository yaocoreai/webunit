import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { resolve } from "node:path";

import { applicationDatabaseSchema } from "../database/schema/application";
import { renderSqlSchema } from "../src/function/common/db/schema";
import { migrateSqlite } from "./database-migrations.mts";

const root = resolve(import.meta.dirname, "..");
const expected = new Database(":memory:");
const migrated = new Database(":memory:");

try {
  expected.exec(renderSqlSchema(applicationDatabaseSchema));
  const migration = await migrateSqlite(migrated, root);
  assert.deepEqual(
    schemaSnapshot(migrated),
    schemaSnapshot(expected),
    "baseline plus immutable migrations differs from the current declared schema",
  );
  assert.deepEqual(migrated.pragma("foreign_key_check"), []);
  assert.equal(
    (migrated.pragma("integrity_check") as Array<{ integrity_check: string }>)[0]?.integrity_check,
    "ok",
  );
  console.info(
    `[db:check:baseline] status=completed dialect=sqlite deployments=node,container,d1 version=${migration.currentVersion} tables=${applicationDatabaseSchema.length}`,
  );
} finally {
  expected.close();
  migrated.close();
}

function schemaSnapshot(database: Database.Database) {
  const tables = database.prepare(
    "select name,sql from sqlite_master where type='table' and name not like 'sqlite_%' order by name",
  ).all() as Array<{ name: string; sql: string }>;
  return tables.map((table) => ({
    name: table.name,
    columns: (database.pragma(`table_xinfo(${quoted(table.name)})`) as Array<Record<string, unknown>>)
      .map(({ name, type, notnull, dflt_value, pk, hidden }) => ({ name, type, notnull, dflt_value, pk, hidden }))
      .sort(byName),
    foreignKeys: (database.pragma(`foreign_key_list(${quoted(table.name)})`) as Array<Record<string, unknown>>)
      .map(({ table: target, from, to, on_update, on_delete, match }) => ({ target, from, to, on_update, on_delete, match }))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    checks: extractChecks(table.sql),
    indexes: (database.pragma(`index_list(${quoted(table.name)})`) as Array<{ name: string; unique: number; origin: string; partial: number }>)
      .filter((index) => index.origin !== "pk")
      .map((index) => {
        const sql = database.prepare("select sql from sqlite_master where type='index' and name=?").pluck().get(index.name) as string | undefined;
        return {
          name: index.name,
          unique: index.unique,
          partial: index.partial,
          columns: (database.pragma(`index_info(${quoted(index.name)})`) as Array<{ seqno: number; name: string }>).sort((left, right) => left.seqno - right.seqno).map(({ name }) => name),
          where: normalizeSql(sql?.match(/\bwhere\b([\s\S]*)$/i)?.[1] ?? ""),
        };
      })
      .sort(byName),
  }));
}

function extractChecks(sql: string) {
  const normalized = normalizeSql(sql);
  const checks: string[] = [];
  for (let cursor = 0; cursor < normalized.length;) {
    const start = normalized.indexOf("check(", cursor);
    if (start < 0) break;
    let depth = 1;
    let end = start + 6;
    while (end < normalized.length && depth > 0) {
      if (normalized[end] === "(") depth += 1;
      if (normalized[end] === ")") depth -= 1;
      end += 1;
    }
    checks.push(normalized.slice(start + 6, end - 1));
    cursor = end;
  }
  return checks.sort();
}

function normalizeSql(value: string) {
  return value.toLowerCase().replaceAll('"', "").replaceAll("`", "").replaceAll("[", "").replaceAll("]", "").replaceAll(/\s+/g, "").replaceAll("==", "=");
}

function quoted(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function byName(left: { name?: unknown }, right: { name?: unknown }) {
  return String(left.name).localeCompare(String(right.name));
}
