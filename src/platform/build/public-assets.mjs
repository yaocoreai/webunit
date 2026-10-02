import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readSourceProvider } from '../../../scripts/source-provider.mjs';
import { collectStringProperties, parseTypescript } from '../../../scripts/typescript-static.mjs';

const roots = [
  { pathname: '/storage/', output: 'storage', source: new URL('../../theme/datas/storage/', import.meta.url), indexed: true },
  { pathname: '/assets/', output: 'assets', source: new URL('../../theme/assets/', import.meta.url) },
];
const storageIndex = new URL('../../theme/datas/storage/index.ts', import.meta.url);
const rootPaths = roots.map(({ source }) => fileURLToPath(source));
const defaultSourceProvider = await readSourceProvider(new URL('../composition/source.ts', import.meta.url));

export function selectPublishedStoragePaths(indexSource, availablePaths) {
  const declaredPaths = new Set(collectStringProperties(parseTypescript(indexSource, 'datas/storage/index.ts'), 'url', '/storage/')
    .map((value) => value.slice('/storage/'.length)));
  const available = new Set(availablePaths);
  const missing = [...declaredPaths].filter((path) => !available.has(path));
  if (missing.length) throw new Error(`Datas storage files are missing: ${missing.join(', ')}`);
  return availablePaths.filter((path) => declaredPaths.has(path));
}

async function readAssets(provider, renderer) {
  if (renderer !== 'theme') return [];
  const assets = [];
  const visit = async (directory, prefix = '') => {
    const files = [];
    const entries = await readdir(directory, { withFileTypes: true }).catch((error) => error?.code === 'ENOENT' ? [] : Promise.reject(error));
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const source = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      if (entry.isDirectory()) files.push(...await visit(source, path));
      else if (source.href !== storageIndex.href) files.push({ path, source });
    }
    return files;
  };
  for (const root of roots) {
    if (root.indexed && provider !== 'datas') continue;
    const files = await visit(root.source);
    const publishedPaths = root.indexed
      ? selectPublishedStoragePaths(await readFile(storageIndex, 'utf8'), files.map(({ path }) => path))
      : files.map(({ path }) => path);
    const published = new Set(publishedPaths);
    for (const file of files) {
      if (published.has(file.path)) assets.push({ ...root, path: file.path, source: file.source });
    }
  }
  return assets;
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function contentType(path) {
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
  return contentTypes[extension] ?? 'application/octet-stream';
}

export function publicAssets(options = {}) {
  let assets;
  const provider = options.sourceProvider ?? defaultSourceProvider;
  const renderer = options.renderer ?? 'theme';
  const load = async () => assets ??= await readAssets(provider, renderer);
  return {
    name: 'platform-public-assets',
    async buildStart() { await load(); },
    configureServer(server) {
      if (renderer === 'theme') server.watcher.add(rootPaths);
      server.watcher.on('all', (_event, path) => {
        if (rootPaths.some((root) => path.startsWith(root))) assets = undefined;
      });
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://local').pathname;
        const asset = (await load()).find((candidate) => pathname.startsWith(candidate.pathname)
          && candidate.path === decodeURIComponent(pathname.slice(candidate.pathname.length)));
        if (!asset) return next();
        const content = await readFile(asset.source);
        response.statusCode = 200;
        response.setHeader('content-type', contentType(asset.path));
        response.setHeader('content-length', String(content.byteLength));
        response.end(request.method === 'HEAD' ? undefined : content);
      });
    },
    async generateBundle() {
      for (const asset of await load()) this.emitFile({ type: 'asset', fileName: `${asset.output}/${asset.path}`, source: await readFile(asset.source) });
    },
  };
}
