import Database from "better-sqlite3";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applicationDatabaseSchema } from "../database/schema/application";
import { renderSqlSchema } from "@/function/common/db/schema";
import { loadPlatformEnvironment } from "./environment.mjs";
import { readBaselineVersion } from "./database-baseline.mts";

await loadPlatformEnvironment("node", new URL("../../", import.meta.url));
const name = String(
  process.argv.slice(2).find((value) => value !== "--") ?? "schema",
)
  .trim()
  .toLowerCase();
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
  throw new Error(
    "Migration name must use lowercase letters, numbers, and hyphens",
  );
const databaseFile = resolve(
  process.env.WEB_DATABASE_FILE ??
    resolve(import.meta.dirname, "../../.data/node/site.sqlite"),
);
const database = new Database(databaseFile, {
  readonly: true,
  fileMustExist: true,
});
const actual = new Map<string, string>();
try {
  for (const row of database
    .prepare(
      "select type,name,sql from sqlite_master where type in ('table','index') and name not like 'sqlite_%' and sql is not null order by type,name",
    )
    .all() as Array<{ type: string; name: string; sql: string }>)
    actual.set(`${row.type}:${row.name}`, normalize(row.sql));
} finally {
  database.close();
}

const desired = statements(renderSqlSchema(applicationDatabaseSchema));
const additions = desired.filter(({ key }) => !actual.has(key));
const changed = desired.filter(
  ({ key, sql }) => actual.has(key) && actual.get(key) !== normalize(sql),
);
const desiredKeys = new Set(desired.map(({ key }) => key));
const removals = [...actual.keys()].filter((key) => !desiredKeys.has(key));
if (changed.length || removals.length)
  throw new Error(
    `Schema contains non-additive differences. Changed: ${changed.map(({ key }) => key).join(", ") || "none"}; removed: ${removals.join(", ") || "none"}. Review manually or run pnpm db:rebuild:node after pnpm db:migration:compact.`,
  );
if (!additions.length) {
  console.log(
    "Database schema already matches the declarations; no migration created.",
  );
  process.exit(0);
}
const directory = new URL("../database/migrations/versions/", import.meta.url);
await mkdir(directory, { recursive: true });
const existingVersions = (
  await import("node:fs/promises").then(({ readdir }) => readdir(directory))
)
  .flatMap((file) => /^([0-9]{4})_/.exec(file)?.[1] ?? [])
  .map(Number);
const baseline = Number(
  await readBaselineVersion(resolve(import.meta.dirname, "..")),
);
const version = String(Math.max(baseline, ...existingVersions) + 1).padStart(
  4,
  "0",
);
const output = new URL(
  `${version}_${name.replaceAll("-", "_")}.sql`,
  directory,
);
await writeFile(
  output,
  `${additions.map(({ sql }) => `${sql};`).join("\n\n")}\n`,
);
console.log(
  `Created ${output.pathname} from ${additions.length} additive schema differences.`,
);

function statements(schema: string) {
  return schema
    .split(/;\s*(?:\n|$)/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((sql) => {
      const match =
        /^(?:CREATE TABLE|CREATE (?:UNIQUE )?INDEX)\s+([a-z0-9_]+)/i.exec(sql);
      if (!match)
        throw new Error(`Unsupported schema statement: ${sql.slice(0, 80)}`);
      return {
        key: `${/^CREATE TABLE/i.test(sql) ? "table" : "index"}:${match[1]}`,
        sql,
      };
    });
}
function normalize(sql: string) {
  return sql
    .replaceAll('"', "")
    .replaceAll("`", "")
    .replaceAll("[", "")
    .replaceAll("]", "")
    .replace(/\s+/g, " ")
    .replace(/\s*([(),])\s*/g, "$1")
    .trim()
    .toLowerCase();
}
