import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const generatedRoots = [
  "src/function/bootstrap/generated",
  "release/generated/function",
  "src/platform/generated/function-api",
  "src/platform/generated/function-openapi.json",
  "../admin/src/api/function/generated.ts",
  "../admin/src/api/function/protocol.ts",
];

const before = await snapshot();
for (const script of [
  "scripts/generate-function-api.mts",
]) {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(`${result.stdout}${result.stderr}`);
    process.exit(result.status ?? 1);
  }
}
const after = await snapshot();
if (JSON.stringify(before) !== JSON.stringify(after)) {
  throw new Error("Function generated artifacts changed after regeneration");
}
console.info(
  `[function:generated] status=completed files=${Object.keys(after).length}`,
);

async function snapshot() {
  const files = (
    await Promise.all(generatedRoots.map((path) => visit(resolve(root, path))))
  )
    .flat()
    .sort();
  return Object.fromEntries(
    await Promise.all(
      files.map(async (path) => [
        relative(root, path),
        createHash("sha256").update(await readFile(path)).digest("hex"),
      ]),
    ),
  );
}

async function visit(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch((error) =>
    error?.code === "ENOTDIR" ? undefined : Promise.reject(error),
  );
  if (!entries) return [path];
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? visit(resolve(path, entry.name))
          : [resolve(path, entry.name)],
      ),
    )
  ).flat();
}
