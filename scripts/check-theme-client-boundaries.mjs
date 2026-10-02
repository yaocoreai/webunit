import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const themeRoot = resolve(root, 'src/theme');
const clientFiles = (await visit(themeRoot)).filter((file) => file.endsWith('.client.ts')).sort();
const astroFiles = (await visit(themeRoot)).filter((file) => file.endsWith('.astro')).sort();
const astroSources = new Map(await Promise.all(astroFiles.map(async (file) => [file, await readFile(file, 'utf8')])));
const browserImports = new Map();
const serverImports = new Map();

for (const [file, source] of astroSources) {
  const frontmatter = source.startsWith('---') ? source.slice(3, source.indexOf('\n---', 3)) : '';
  for (const specifier of importsOf(frontmatter)) addImport(serverImports, resolveImport(file, specifier), file);
  for (const match of source.matchAll(/<script(?![^>]*\bis:inline\b)[^>]*>([\s\S]*?)<\/script>/g)) {
    for (const specifier of importsOf(match[1])) addImport(browserImports, resolveImport(file, specifier), file);
  }
}

for (const file of clientFiles) {
  const source = await readFile(file, 'utf8');
  const relativePath = normalize(relative(root, file));
  assert.ok(ownerOf(relativePath), `Theme browser module has no component owner: ${relativePath}`);
  assert.ok(browserImports.has(file), `Theme browser module is not imported by an ordinary Astro <script>: ${relativePath}`);
  assert.ok(!serverImports.has(file), `Theme browser module is imported by Astro server frontmatter: ${relativePath}`);
  assert.doesNotMatch(source, /\bprocess\.env\b|\bimport\.meta\.env\b/, `Theme browser module reads environment state: ${relativePath}`);
  assert.doesNotMatch(source, /(?:API_KEY|SECRET|PASSWORD|PRIVATE_KEY|FUNCTION_DATA_PROTECTION_KEY)/, `Theme browser module contains a server-secret marker: ${relativePath}`);
  for (const specifier of importsOf(source)) {
    assert.ok(!specifier.startsWith('node:'), `Theme browser module imports Node: ${relativePath} -> ${specifier}`);
    assert.ok(!specifier.startsWith('@/function/'), `Theme browser module imports Service: ${relativePath} -> ${specifier}`);
    assert.ok(!specifier.startsWith('@/platform/function/'), `Theme browser module imports the Platform Function adapter: ${relativePath} -> ${specifier}`);
    assert.ok(!/^@\/platform\/(?:runtime|server|composition|protocols|service)\//.test(specifier), `Theme browser module imports server Platform code: ${relativePath} -> ${specifier}`);
  }
  for (const match of source.matchAll(/^import\s+(?!type\b)[\s\S]*?from\s*['"]([^'"]+)['"];?$/gm)) {
    assert.ok(!match[1].startsWith('@/theme/datas/'), `Theme browser module statically imports Datas: ${relativePath} -> ${match[1]}`);
  }
}

if (process.argv.includes('--dist')) await verifyCompiledGraph();

console.info(`[theme:client-boundaries] status=completed modules=${clientFiles.length} compiled=${process.argv.includes('--dist')}`);

async function verifyCompiledGraph() {
  const reportPath = resolve(root, '.wrangler/reports/bundle-attribution.json');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const builds = report.builds ?? [];
  const clientBuilds = builds.filter((build) => /(?:^|\/)dist\/workers\/client$/.test(build.directory ?? ''));
  const serverBuilds = builds.filter((build) => /(?:^|\/)dist\/workers\/server$/.test(build.directory ?? ''));
  assert.ok(clientBuilds.length, 'Bundle attribution is missing the Workers browser build');
  assert.ok(serverBuilds.length, 'Bundle attribution is missing the Workers server build');
  const clientModules = new Map();
  for (const build of clientBuilds) for (const chunk of build.chunks) for (const module of chunk.modules) {
    const outputs = clientModules.get(module.id) ?? [];
    outputs.push(chunk.fileName);
    clientModules.set(module.id, outputs);
    await stat(resolve(root, 'dist/workers/client', chunk.fileName));
  }
  const serverClientModules = serverBuilds.flatMap((build) => build.chunks)
    .flatMap((chunk) => chunk.modules.map((module) => ({ chunk: chunk.fileName, module: module.id })))
    .filter(({ module }) => module.endsWith('.client.ts'));
  assert.deepEqual(serverClientModules, [], `Theme browser modules entered Workers server chunks: ${JSON.stringify(serverClientModules)}`);
  const deployedServerModules = new Set(serverBuilds.flatMap((build) => build.chunks).flatMap((chunk) => chunk.modules.map((module) => module.id)));
  for (const file of clientFiles) {
    const id = normalize(relative(root, file));
    const ownerEntries = (browserImports.get(file) ?? []).map((owner) => normalize(relative(root, owner)));
    const deployed = ownerEntries.some((owner) => deployedServerModules.has(owner));
    if (!deployed) continue;
    const compiled = clientModules.has(id) || [...clientModules.keys()].some((module) =>
      ownerEntries.some((owner) => module.startsWith(`${owner}?astro&type=script&`)),
    );
    assert.ok(compiled, `Theme browser module has no compiled browser owner chunk: ${id}`);
  }
  const datasModules = clientBuilds.flatMap((build) => build.chunks)
    .flatMap((chunk) => chunk.modules.map((module) => ({ chunk: chunk.fileName, module: module.id })))
    .filter(({ module }) => module.startsWith('src/theme/datas/'));
  assert.deepEqual(datasModules, [], `Theme Datas entered production browser assets: ${JSON.stringify(datasModules)}`);
}

function importsOf(source) {
  return [...source.matchAll(/(?:^|[;\n])\s*(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map((match) => match[1]);
}

function resolveImport(importer, specifier) {
  if (specifier.startsWith('@/')) return resolve(root, 'src', specifier.slice(2));
  if (specifier.startsWith('.')) return resolve(dirname(importer), specifier);
  return specifier;
}

function addImport(map, specifier, importer) {
  if (typeof specifier !== 'string') return;
  const normalized = specifier.endsWith('.ts') ? specifier : `${specifier}.ts`;
  const importers = map.get(normalized) ?? [];
  importers.push(importer);
  map.set(normalized, importers);
}

function ownerOf(path) {
  const match = path.match(/^src\/theme\/(sections|partials)\/([^/]+)\/([^/]+)\.client\.ts$/);
  if (match && match[2] === match[3]) return `theme:${match[1].slice(0, -1)}:${match[2]}`;
  return undefined;
}

function normalize(path) {
  return path.replaceAll('\\', '/');
}

async function visit(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? visit(path) : [path];
  }))).flat();
}
