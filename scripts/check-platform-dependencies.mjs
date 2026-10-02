import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { collectModuleSpecifiers, parseTypescript } from './typescript-static.mjs';

const root = resolve(import.meta.dirname, '../src/platform');
const failures = [];

const visit = async (directory) => (await Promise.all((await readdir(directory, { withFileTypes: true })).map((entry) => {
  const path = resolve(directory, entry.name);
  if (entry.isDirectory()) return visit(path);
  return /\.(?:astro|mjs|ts)$/.test(entry.name) ? [path] : [];
}))).flat();

const files = await visit(root);
const fileSet = new Set(files);
const graph = new Map();
const ownerDependencies = new Map();
const ownerOf = (file) => relative(root, file).split('/')[0];
const resolveImport = (owner, specifier) => {
  let candidate;
  if (specifier === '@/platform/theme') candidate = resolve(root, 'theme/facade');
  else if (specifier === '@/platform/datas') candidate = resolve(root, 'theme/datas/facade');
  else if (specifier.startsWith('@/platform/')) candidate = resolve(root, specifier.slice('@/platform/'.length));
  else if (specifier.startsWith('.')) candidate = resolve(dirname(owner), specifier);
  else return undefined;
  return [candidate, `${candidate}.ts`, `${candidate}.astro`, `${candidate}.mjs`, resolve(candidate, 'index.ts')].find((path) => fileSet.has(path));
};

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const dependencies = [];
  for (const specifier of collectModuleSpecifiers(parseTypescript(source, file))) {
    const dependency = resolveImport(file, specifier);
    if (dependency) {
      dependencies.push(dependency);
      const owner = ownerOf(file);
      const dependencyOwner = ownerOf(dependency);
      if (owner !== dependencyOwner) {
        const owners = ownerDependencies.get(owner) ?? new Set();
        owners.add(dependencyOwner);
        ownerDependencies.set(owner, owners);
      }
    }
  }
  graph.set(file, dependencies);
}

const actualDirectories = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
for (const required of ['build', 'cache', 'common', 'composition', 'function', 'generated', 'http', 'infrastructure', 'runtime', 'schema', 'theme', 'web']) {
  if (!actualDirectories.includes(required)) failures.push(`Platform is missing required owner directory: ${required}`);
}
for (const obsolete of ['api', 'bridges', 'facades', 'installation', 'pages', 'protocols', 'render']) {
  const obsoleteRoot = resolve(root, obsolete);
  const obsoleteFiles = files.filter((file) => file.startsWith(`${obsoleteRoot}/`));
  if (obsoleteFiles.length) failures.push(`Platform retains obsolete ${obsolete} ownership: ${obsoleteFiles.map((file) => relative(root, file)).join(', ')}`);
}
for (const obsolete of [resolve(root, 'runtime/preview')]) {
  const obsoleteFiles = files.filter((file) => file.startsWith(`${obsolete}/`));
  if (obsoleteFiles.length) failures.push(`Platform retains Theme Preview outside platform/theme: ${obsoleteFiles.map((file) => relative(root, file)).join(', ')}`);
}
const rootFiles = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
if (JSON.stringify(rootFiles) !== JSON.stringify(['cloudflare-workers.d.ts', 'middleware.ts'])) failures.push(`Platform root files: ${rootFiles.join(', ')}`);

const domainAdapters = new Set(['function', 'theme', 'web']);
const foundationOwners = new Set(['common', 'schema', 'cache', 'http']);
for (const [owner, dependencies] of ownerDependencies) {
  for (const dependency of dependencies) {
    if (foundationOwners.has(owner) && domainAdapters.has(dependency)) {
      failures.push(`Platform Foundation imports a domain adapter: ${owner} -> ${dependency}`);
    }
    if (owner === 'function' && (dependency === 'theme' || dependency === 'web')) {
      failures.push(`Platform Function adapter imports a Renderer adapter: ${owner} -> ${dependency}`);
    }
    if (owner === 'theme' && dependency === 'function') {
      failures.push(`Platform Theme adapter imports the Function adapter instead of receiving a composed Content source: ${owner} -> ${dependency}`);
    }
    if (owner === 'theme' && dependency === 'web') {
      failures.push(`Platform Theme adapter imports the Web adapter: ${owner} -> ${dependency}`);
    }
    if (owner === 'web' && dependency === 'theme') {
      failures.push(`Platform Web adapter imports the Theme adapter: ${owner} -> ${dependency}`);
    }
  }
}

const forbiddenImports = [
  ['define', ['datas']],
  ['content', ['datas']],
  ['http', ['datas']],
  ['source', ['theme', 'web']],
  ['runtime', ['theme', 'web']],
];
for (const [owner, forbidden] of forbiddenImports) {
  for (const file of files.filter((path) => path.startsWith(resolve(root, owner) + '/'))) {
    for (const dependency of graph.get(file) ?? []) {
      if (forbidden.includes(ownerOf(dependency))) failures.push(`${relative(root, file)} imports ${relative(root, dependency)}`);
    }
  }
}

const visited = new Set();
const active = new Set();
const stack = [];
const cycles = new Set();
const walk = (file) => {
  if (active.has(file)) {
    const start = stack.indexOf(file);
    cycles.add([...stack.slice(start), file].map((path) => relative(root, path)).join(' -> '));
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
for (const cycle of cycles) failures.push(`Platform dependency cycle: ${cycle}`);

if (failures.length) throw new Error(`Platform dependency check failed:\n${failures.join('\n')}`);
console.log(`Platform dependency check passed (${files.length} files, no cycles)`);
