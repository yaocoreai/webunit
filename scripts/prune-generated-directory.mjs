import { readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

export async function pruneGeneratedDirectory(directory, expectedEntries) {
  const expected = new Set(expectedEntries);
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error) => (error?.code === "ENOENT" ? [] : Promise.reject(error)),
  );
  await Promise.all(
    entries
      .filter((entry) => !expected.has(entry.name))
      .map((entry) =>
        rm(resolve(directory, entry.name), { recursive: true, force: true }),
      ),
  );
}
