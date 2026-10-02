import { readdir } from 'node:fs/promises';

const reservedPageRoots = Object.freeze(['_']);

export function createPlatformRoutesIntegration(options) {
  const { editorEnabled, renderer, siteRoot, workers } = options;
  return {
    name: 'platform-routes',
    hooks: {
      'astro:config:setup': async ({ addMiddleware, injectRoute }) => {
        await assertProjectPageBoundaries(siteRoot);
        if (workers) {
          addMiddleware({
            order: 'pre',
            entrypoint: './src/platform/runtime/workers-environment-middleware.ts',
          });
        }
        addMiddleware({
          order: 'pre',
          entrypoint: './src/platform/middleware.ts',
        });
        injectRoute({
          pattern: '/_/[...path]',
          entrypoint: './src/platform/function/pages/_/[...path].ts',
        });
        if (renderer === 'theme' && editorEnabled) {
          addMiddleware({
            order: 'pre',
            entrypoint: './src/platform/composition/theme-editor-middleware.ts',
          });
          injectRoute({
            pattern: '/_setting_',
            entrypoint: './src/platform/theme/pages/_setting_.ts',
          });
          injectRoute({
            pattern: '/_preview_',
            entrypoint: './src/platform/theme/pages/_preview_.astro',
          });
        }
        if (renderer !== 'web' && renderer !== 'theme') {
          throw new Error(`Unknown Platform renderer: ${renderer}`);
        }
      },
    },
  };
}

export async function assertProjectPageBoundaries(siteRoot) {
  const pagesRoot = new URL('src/web/pages/', siteRoot);
  const entries = await readdir(pagesRoot, { withFileTypes: true }).catch((error) => {
    if (error?.code === 'ENOENT') return [];
    throw error;
  });
  const conflicts = entries.flatMap((entry) => {
    const routeRoot = entry.isDirectory()
      ? entry.name
      : entry.name.replace(/\.(?:astro|[cm]?[jt]sx?)$/, '');
    return reservedPageRoots.includes(routeRoot) ? [entry.name] : [];
  });
  if (conflicts.length) {
    throw new Error(
      `Project Pages cannot occupy Platform routes: ${conflicts.sort().join(', ')}`,
    );
  }
}
