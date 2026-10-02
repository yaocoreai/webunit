import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

export async function loadDatabaseSeeds(root) {
  const directory = resolve(root, "database/seeds");
  const names = await readdir(directory).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const files = names
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  return Promise.all(files.map(async (file) => {
    const sql = await readFile(resolve(directory, file), "utf8");
    if (!sql.trim()) throw new Error(`Database Seed is empty: ${file}`);
    return {
      key: `database/seeds/${basename(file, ".sql")}`,
      checksum: createHash("sha256").update(sql).digest("hex"),
      file,
      sql,
    };
  }));
}

export function applySqliteSeeds(database, seeds, appliedAt = new Date().toISOString()) {
  const applied = new Map(
      database.prepare("select seed_key,checksum from database_seed_records order by seed_key").all()
        .map((row) => [String(row.seed_key), String(row.checksum)]),
    ),
    known = new Set(seeds.map((seed) => seed.key)),
    unknown = [...applied.keys()].filter((key) => !known.has(key));
  if (unknown.length) throw new Error(`Database contains unknown Seeds: ${unknown.join(", ")}`);
  let count = 0;
  for (const seed of seeds) {
    const checksum = applied.get(seed.key);
    if (checksum && checksum !== seed.checksum) throw new Error(`Seed checksum changed: ${seed.key}`);
    if (checksum) continue;
    database.transaction(() => {
      database.exec(seed.sql);
      database.prepare("insert into database_seed_records (seed_key,checksum,applied_at) values (?,?,?)")
        .run(seed.key, seed.checksum, appliedAt);
    })();
    count += 1;
  }
  return { applied: count, total: seeds.length };
}
