import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

export function bundleAttribution(options) {
  const root = resolve(options.root);
  const output = resolve(root, '.wrangler/reports/bundle-attribution.json');
  const builds = [];
  let writeQueue = Promise.resolve();

  return {
    name: 'webunit-bundle-attribution',
    apply: 'build',
    generateBundle(outputOptions, bundle) {
      const chunks = Object.values(bundle)
        .filter((item) => item.type === 'chunk')
        .map((chunk) => ({
          fileName: chunk.fileName,
          facadeModuleId: chunk.facadeModuleId ? normalizeModuleId(chunk.facadeModuleId, root) : undefined,
          isEntry: chunk.isEntry,
          isDynamicEntry: chunk.isDynamicEntry,
          loading: chunk.isEntry ? 'entry' : chunk.isDynamicEntry ? 'dynamic' : 'shared',
          rawBytes: Buffer.byteLength(chunk.code),
          imports: [...chunk.imports].sort(),
          dynamicImports: [...chunk.dynamicImports].sort(),
          modules: Object.entries(chunk.modules)
            .map(([id, module]) => ({
              id: normalizeModuleId(id, root),
              owner: moduleOwner(id, root),
              renderedLength: module.renderedLength,
              loading: chunk.isDynamicEntry ? 'dynamic' : 'static',
            }))
            .sort((left, right) => left.id.localeCompare(right.id)),
        }))
        .sort((left, right) => left.fileName.localeCompare(right.fileName));
      builds.push({
        environment: this.environment?.name ?? 'unknown',
        directory: outputOptions.dir
          ? normalizeModuleId(outputOptions.dir, root)
          : undefined,
        format: outputOptions.format,
        chunks,
      });
      writeQueue = writeQueue.then(async () => {
        await mkdir(dirname(output), { recursive: true });
        await writeFile(
          output,
          `${JSON.stringify({ version: 1, target: options.target, builds }, null, 2)}\n`,
        );
      });
      return writeQueue;
    },
  };
}

function normalizeModuleId(id, root) {
  const clean = id.replace(/\\/g, '/').replace(/^\0/, 'virtual:');
  if (!clean.startsWith(`${root}/`)) return clean;
  return relative(root, clean).replace(/\\/g, '/');
}

function moduleOwner(id, root) {
  const normalized = normalizeModuleId(id, root);
  const theme = normalized.match(
    /^src\/theme\/(sections|templates|partials)\/([^/]+)\//,
  );
  if (theme) return `theme:${singular(theme[1])}:${theme[2]}`;
  if (normalized.startsWith('src/theme/layout/')) return 'theme:layout';
  if (normalized.startsWith('src/theme/assets/')) return 'theme:assets';
  if (normalized.startsWith('src/theme/datas/')) return 'theme:datas';
  const functionFeature = normalized.match(
    /^src\/function\/features\/([^/]+)(?:\/([^/]+))?\//,
  );
  if (functionFeature)
    return `function:feature:${functionFeature[1]}${functionFeature[2] ? `:${functionFeature[2]}` : ''}`;
  const functionCommon = normalized.match(/^src\/function\/common\/([^/]+)\//);
  if (functionCommon) return `function:common:${functionCommon[1]}`;
  const functionInfrastructure = normalized.match(
    /^src\/function\/infrastructure\/([^/]+)\//,
  );
  if (functionInfrastructure)
    return `function:infrastructure:${functionInfrastructure[1]}`;
  if (normalized.startsWith('src/function/app/')) return 'function:app';
  if (normalized.startsWith('src/function/bootstrap/generated/'))
    return 'function:bootstrap-generated';
  if (normalized.startsWith('src/function/bootstrap/'))
    return 'function:bootstrap';
  const platform = normalized.match(/^src\/platform\/([^/]+)\//);
  if (platform) return `platform:${platform[1]}`;
  const dependency = normalized.match(/node_modules\/(?:\.pnpm\/)?([^/]+)/);
  if (dependency) return `dependency:${dependency[1]}`;
  if (normalized.startsWith('virtual:') || normalized.startsWith('\0'))
    return 'virtual';
  return 'other';
}

function singular(value) {
  return value.endsWith('s') ? value.slice(0, -1) : value;
}
