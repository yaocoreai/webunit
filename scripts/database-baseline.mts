import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export function foldedVersions(baselineVersion: string): string[] {
  if (!/^\d{4}$/.test(baselineVersion))
    throw new Error(`Invalid BASELINE_VERSION: ${baselineVersion}`);
  const max = Number(baselineVersion);
  return Array.from({ length: max }, (_, index) =>
    String(index + 1).padStart(4, "0"),
  );
}

export function knownMigrationVersions(
  baselineVersion: string,
  fileVersions: readonly string[],
): Set<string> {
  return new Set([
    "0000",
    ...foldedVersions(baselineVersion),
    ...fileVersions,
  ]);
}

export async function readBaselineVersion(root: string): Promise<string> {
  const value = (
    await readFile(resolve(root, "database/migrations/BASELINE_VERSION"), "utf8")
  ).trim();
  if (!/^\d{4}$/.test(value))
    throw new Error(`Invalid BASELINE_VERSION: ${value}`);
  return value;
}

export async function listMigrationFiles(root: string): Promise<string[]> {
  const directory = resolve(root, "database/migrations/versions");
  return (
    await readdir(directory).catch((error) => {
      if (error?.code === "ENOENT") return [] as string[];
      throw error;
    })
  )
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
}

export function dumpSqliteSchemaSql(statements: readonly string[]): string {
  return `${statements.map((sql) => `${sql.replace(/;+\s*$/, "")};`).join("\n\n")}\n`;
}

export async function writeBaselineVersion(root: string, version: string) {
  if (!/^\d{4}$/.test(version))
    throw new Error(`Invalid BASELINE_VERSION: ${version}`);
  await writeFile(
    resolve(root, "database/migrations/BASELINE_VERSION"),
    `${version}\n`,
  );
}

export async function compactVersionFiles(root: string): Promise<string[]> {
  const directory = resolve(root, "database/migrations/versions");
  const files = await listMigrationFiles(root);
  for (const file of files) await unlink(resolve(directory, file));
  await writeFile(resolve(directory, ".gitkeep"), "");
  return files;
}
