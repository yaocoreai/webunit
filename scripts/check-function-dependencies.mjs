import { readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import {
  collectStaticRuntimeModuleSpecifiers,
  parseTypescript,
} from "./typescript-static.mjs";

const root = resolve(import.meta.dirname, "../src/function");

const visit = async (directory) =>
  (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map((entry) => {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) return visit(path);
        return entry.name.endsWith(".ts") ? [path] : [];
      }),
    )
  ).flat();

const files = await visit(root);
const fileSet = new Set(files);
const unresolved = [];
const resolveImport = (owner, specifier) => {
  let candidate;
  if (specifier.startsWith("@/function/")) {
    candidate = resolve(root, specifier.slice("@/function/".length));
  } else if (specifier.startsWith(".")) {
    candidate = resolve(dirname(owner), specifier);
  } else {
    return undefined;
  }
  return [candidate, `${candidate}.ts`, resolve(candidate, "index.ts")].find(
    (path) => fileSet.has(path),
  );
};

const graph = new Map();
for (const file of files) {
  const source = await readFile(file, "utf8");
  const specifiers = collectStaticRuntimeModuleSpecifiers(
    parseTypescript(source, file),
  );
  const dependencies = specifiers
    .map((specifier) => {
      const dependency = resolveImport(file, specifier);
      const relativeTarget = specifier.startsWith(".")
        ? resolve(dirname(file), specifier)
        : undefined;
      if (
        !dependency
        && (specifier.startsWith("@/function/")
          || relativeTarget?.startsWith(`${root}/`))
      ) {
        unresolved.push(`${relative(root, file)} -> ${specifier}`);
      }
      return dependency;
    })
    .filter((dependency) => dependency !== undefined);
  graph.set(file, dependencies);
}

const visited = new Set();
const active = new Set();
const stack = [];
const cycles = new Set();
const walk = (file) => {
  if (active.has(file)) {
    const start = stack.indexOf(file);
    cycles.add(
      [...stack.slice(start), file]
        .map((path) => relative(root, path))
        .join(" -> "),
    );
    return;
  }
  if (visited.has(file)) return;
  visited.add(file);
  active.add(file);
  stack.push(file);
  for (const dependency of graph.get(file) ?? []) walk(dependency);
  stack.pop();
  active.delete(file);
};
for (const file of files) walk(file);

if (unresolved.length || cycles.size) {
  throw new Error(
    `Function dependency check failed:\n${[
      ...unresolved.map((dependency) => `Unresolved Function static dependency: ${dependency}`),
      ...[...cycles].map((cycle) => `Function static dependency cycle: ${cycle}`),
    ]
      .join("\n")}`,
  );
}
console.info(
  `Function dependency check passed (${files.length} files, no static runtime cycles)`,
);
