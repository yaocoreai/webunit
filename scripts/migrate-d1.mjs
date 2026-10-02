import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { access, mkdir, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { loadPlatformEnvironment } from "./environment.mjs";

await loadPlatformEnvironment("cloudflare", new URL("../../", import.meta.url));

const root = resolve(import.meta.dirname, ".."),
  config = resolve(
    root,
    process.argv[2] || "dist/workers/server/wrangler.json",
  ),
  wrangler = resolve(root, "node_modules/wrangler/bin/wrangler.js"),
  stamp = new Date().toISOString().replace(/[:.]/g, "-"),
  suppliedBackup = process.env.D1_MIGRATION_BACKUP_PATH?.trim(),
  backup = suppliedBackup
    ? resolve(root, suppliedBackup)
    : resolve(root, "../.backups", `d1-${stamp}.sql`),
  directory = resolve(root, "database/migrations/versions"),
  files = (
    await readdir(directory).catch((error) => {
      if (error?.code === "ENOENT") return [];
      throw error;
    })
  )
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort(),
  migrations = await Promise.all(
    files.map(async (file) => {
      const sql = await readFile(resolve(directory, file), "utf8");
      return {
        version: file.slice(0, 4),
        name: file.slice(5, -4),
        file: resolve(directory, file),
        checksum: hash(sql),
      };
    }),
  ),
  baseline = resolve(root, "database/migrations/0000_initial.sql"),
  baselineSql = await readFile(baseline, "utf8"),
  baselineVersion = (await readFile(resolve(root, "database/migrations/BASELINE_VERSION"), "utf8")).trim(),
  folded = Array.from({ length: Number(baselineVersion) }, (_, index) =>
    String(index + 1).padStart(4, "0"),
  );
await mkdir(resolve(root, "../.backups"), { recursive: true });
if (suppliedBackup) await access(backup);
else
  run([
    "d1",
    "export",
    "DB",
    "--remote",
    "--config",
    config,
    "--output",
    backup,
  ], 3);
let tables = query(
  "select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '_cf_%'",
).map((row) => String(row.name));
if (!tables.includes("system_migration_versions")) {
  if (!tables.length) {
    run([
      "d1",
      "execute",
      "DB",
      "--remote",
      "--config",
      config,
      "--file",
      baseline,
    ]);
    record("0000", "initial", hash(baselineSql), 0);
    recordFolded(migrations, folded);
  } else {
    const first = migrations[0];
    if (!first || first.version !== "0001")
      throw new Error("Legacy D1 requires migration 0001");
    run([
      "d1",
      "execute",
      "DB",
      "--remote",
      "--config",
      config,
      "--file",
      first.file,
    ]);
    record("0000", "legacy-baseline", "legacy", 0);
    record(first.version, first.name, first.checksum, 0);
  }
}
tables = query(
  "select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '_cf_%'",
).map((row) => String(row.name));
if (
  tables.includes("system_migration_versions") &&
  Number(
    query("select count(*) as count from system_migration_versions")[0]?.count ??
      0,
  ) === 0
) {
  const legacyTranslationTables = [
    "cms_localized_contents",
    "cms_translation_leaves",
    "cms_snapshot_versions",
  ];
  if (
    tables.includes("common_translation_records") &&
    legacyTranslationTables.every((table) => !tables.includes(table))
  ) {
    // A fresh baseline contains the latest schema. Reconcile metadata after an
    // interrupted version-record request without replaying non-idempotent SQL.
    record("0000", "initial", hash(baselineSql), 0);
    recordFolded(migrations, folded);
  } else {
    // Presence of the migration tables proves 0001 completed on a legacy DB.
    // 0002 is intentionally left for the normal guarded migration loop below.
    const first = migrations[0];
    if (!first || first.version !== "0001")
      throw new Error("Interrupted legacy D1 requires migration 0001 metadata");
    record("0000", "legacy-baseline", "legacy", 0);
    record(first.version, first.name, first.checksum, 0);
  }
}
const owner = randomUUID(),
  now = new Date().toISOString(),
  expires = new Date(Date.now() + 120000).toISOString();
command(
  `insert into system_migration_lock (lock_key,owner_id,expires_at,updated_at) values ('schema','${owner}','${expires}','${now}') on conflict(lock_key) do update set owner_id=excluded.owner_id,expires_at=excluded.expires_at,updated_at=excluded.updated_at where system_migration_lock.expires_at<=excluded.updated_at`,
);
const lock = query(
  "select owner_id from system_migration_lock where lock_key='schema'",
)[0];
if (lock?.owner_id !== owner)
  throw new Error("D1 migration lock is held by another executor");
try {
  const applied = new Map(
      query("select version,checksum from system_migration_versions").map(
        (row) => [String(row.version), String(row.checksum)],
      ),
    ),
    known = new Set(["0000", ...folded, ...migrations.map((item) => item.version)]),
    unknown = [...applied.keys()].filter((version) => !known.has(version));
  if (unknown.length)
    throw new Error(`D1 contains unknown migrations: ${unknown.join(", ")}`);
  for (const migration of migrations) {
    const checksum = applied.get(migration.version);
    if (checksum && checksum !== migration.checksum)
      throw new Error(`Migration checksum changed: ${migration.version}`);
    if (checksum) continue;
    assertMigrationPreconditions(migration.version);
    run([
      "d1",
      "execute",
      "DB",
      "--remote",
      "--config",
      config,
      "--file",
      migration.file,
    ]);
    record(migration.version, migration.name, migration.checksum, 0);
  }
} finally {
  command(
    `delete from system_migration_lock where lock_key='schema' and owner_id='${owner}'`,
  );
}

function assertMigrationPreconditions(version) {
  if (version !== "0002") return;
  const existing = new Set(
    query("select name from sqlite_master where type='table'").map((row) =>
      String(row.name),
    ),
  );
  for (const table of ["cms_localized_contents", "cms_translation_leaves"]) {
    if (!existing.has(table)) continue;
    const count = Number(
      query(`select count(*) as count from ${table}`)[0]?.count ?? 0,
    );
    if (count > 0)
      throw new Error(
        `Migration 0002 requires legacy Translation export before cutover: ${table} contains ${count} records`,
      );
  }
}
console.info(
  JSON.stringify({
    event: "d1_migration_completed",
    backup,
    currentVersion: migrations.at(-1)?.version ?? baselineVersion,
  }),
);

function recordFolded(migrations, folded) {
  const byVersion = new Map(migrations.map((item) => [item.version, item]));
  for (const version of folded) {
    const migration = byVersion.get(version);
    if (migration) record(migration.version, migration.name, migration.checksum, 0);
    else record(version, "folded", "folded", 0);
  }
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}
function record(version, name, checksum, executionMs) {
  command(
    `insert into system_migration_versions (version,name,checksum,execution_ms,applied_at) values ('${version}','${name}','${checksum}',${executionMs},'${new Date().toISOString()}') on conflict(version) do nothing`,
  );
}
function command(sql) {
  run([
    "d1",
    "execute",
    "DB",
    "--remote",
    "--config",
    config,
    "--command",
    sql,
  ], 3);
}
function query(sql) {
  const output = run([
    "d1",
    "execute",
    "DB",
    "--remote",
    "--config",
    config,
    "--command",
    sql,
    "--json",
  ], 3);
  return JSON.parse(output).flatMap((result) => result.results ?? []);
}
function run(args, retries = 0) {
  for (let attempt = 0; ; attempt += 1) {
    const result = spawnSync(process.execPath, [wrangler, ...args], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        NO_COLOR: "1",
        WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || ".wrangler/logs",
      },
    });
    if (result.error) throw result.error;
    if (result.status === 0) return result.stdout;
    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (
      attempt >= retries ||
      !/(?:fetch failed|request .* timed out|API timed out)/i.test(output)
    )
      throw new Error(output);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000 * (attempt + 1));
  }
}
