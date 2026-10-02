// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { publicAssets } from './src/platform/build/public-assets.mjs';
import { createPlatformRoutesIntegration } from './src/platform/build/routes-integration.mjs';
import { resolveRenderer } from './src/platform/build/renderer.mjs';
import { bundleAttribution } from './scripts/bundle-attribution.mjs';
import { readSourceProvider } from './scripts/source-provider.mjs';
import { fileURLToPath } from 'node:url';

const siteRoot = new URL('./', import.meta.url);
const renderer = await resolveRenderer(siteRoot, process.env.PLATFORM_RENDERER);
const themeDatasEnabled = process.env.PLATFORM_THEME_DATAS === 'true';
if (themeDatasEnabled && renderer.kind !== 'theme') {
  throw new Error('Theme Datas mode is only available with the Theme renderer');
}
if (themeDatasEnabled && !renderer.datasAvailable) {
  throw new Error('Theme Datas mode requires an installed Theme Datas implementation');
}
const sourceEntry = themeDatasEnabled
  ? new URL('./src/theme/datas/index.ts', import.meta.url)
  : new URL('./src/platform/composition/source.ts', import.meta.url);
const sourceProvider = await readSourceProvider(sourceEntry);
const editorEnabled = renderer.kind === 'theme'
  && sourceProvider === 'function'
  && Boolean(process.env.CMS_ADMIN_ORIGIN);

const modeIndex = process.argv.indexOf('--mode');
const commandTarget = modeIndex >= 0 ? process.argv[modeIndex + 1] : 'node';
if (!['node', 'container', 'cloudflare'].includes(commandTarget)) {
  throw new Error('Astro mode must be node, container, or cloudflare');
}
const workers = commandTarget === 'cloudflare';
const cacheRuntimeAdapter = fileURLToPath(new URL(
  workers
    ? './src/platform/infrastructure/workers/cache-runtime.ts'
    : commandTarget === 'container'
      ? './src/platform/infrastructure/container/cache-runtime.ts'
      : './src/platform/infrastructure/node/cache-runtime.ts',
  import.meta.url,
));
const functionInfrastructureAdapter = fileURLToPath(new URL(
  workers
    ? './src/function/infrastructure/runtime.workers.ts'
    : commandTarget === 'container'
      ? './src/function/infrastructure/runtime.container.ts'
      : './src/function/infrastructure/runtime.node.ts',
  import.meta.url,
));
const functionIdentityAdapter = fileURLToPath(new URL(
  workers
    ? './src/platform/runtime/function-identity.workers.ts'
    : commandTarget === 'container'
      ? './src/platform/runtime/function-identity.container.ts'
      : './src/platform/runtime/function-identity.node.ts',
  import.meta.url,
));
const responseCachePurgeAdapter = fileURLToPath(new URL(
  workers
    ? './src/platform/runtime/response-cache-purge.workers.ts'
    : './src/platform/runtime/response-cache-purge.ts',
  import.meta.url,
));
const contentSource = fileURLToPath(sourceEntry);
const astroWorkerEntry = workers
  ? fileURLToPath(new URL(import.meta.resolve('@astrojs/cloudflare/entrypoints/server')))
  : undefined;

/** @type {import('vite').Plugin} */
const cacheRuntimeAdapterPlugin = {
  name: 'platform-cache-runtime-adapter',
  enforce: 'pre',
  resolveId(source) {
    if (source === '@/platform/runtime/cache') return cacheRuntimeAdapter;
    if (source === '@/function/infrastructure/runtime') return functionInfrastructureAdapter;
    if (source === '@/platform/runtime/function-identity') return functionIdentityAdapter;
    if (source === '@/platform/runtime/response-cache-purge') return responseCachePurgeAdapter;
    if (source === '@/platform/composition/source') return contentSource;
    if (source === 'virtual:webunit-astro-entry' && astroWorkerEntry) return astroWorkerEntry;
  },
};

export default defineConfig({
  srcDir: renderer.srcDir,
  vite: {
    plugins: [
      cacheRuntimeAdapterPlugin,
      bundleAttribution({ root: fileURLToPath(new URL('.', import.meta.url)), target: commandTarget }),
      tailwindcss(),
      publicAssets({ sourceProvider, renderer: renderer.kind }),
    ],
    resolve: {
      alias: [
        { find: '@/platform/runtime/cache', replacement: cacheRuntimeAdapter },
        { find: '@/function/infrastructure/runtime', replacement: functionInfrastructureAdapter },
        { find: '@/platform/runtime/function-identity', replacement: functionIdentityAdapter },
        { find: '@/platform/runtime/response-cache-purge', replacement: responseCachePurgeAdapter },
        { find: '@/platform/composition/source', replacement: contentSource },
      ],
    },
    define: { __PLATFORM_WEB_FUNCTION__: JSON.stringify(sourceProvider === 'function') },
    build: {
      // 浏览器控制器必须生成带哈希的静态资源；否则 Astro 会把小型 Owner 脚本
      // 内联到 SSR Manifest 与 Worker 入口中。
      assetsInlineLimit: 0,
      cssCodeSplit: false,
    },
    server: {
      allowedHosts: ['northstar.local', '.northstar.com', '.northstar.cn'],
    },
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
  },
  security: {
    // Preview POST navigation has its own ticket, exact-origin, Fetch Metadata,
    // media-type, size, and payload validation in the Platform route.
    checkOrigin: false,
  },
  output: 'server',
  build: {
    inlineStylesheets: 'never',
  },
  outDir: workers ? './dist/workers' : './dist',
  adapter: workers ? cloudflare({
    imageService: 'passthrough',
    configPath: process.env.CLOUDFLARE_CONFIG_PATH || './wrangler.jsonc',
    remoteBindings: process.env.CLOUDFLARE_REMOTE_BINDINGS === 'true',
  }) : node({ mode: 'standalone' }),
  integrations: [createPlatformRoutesIntegration({
    editorEnabled,
    renderer: renderer.kind,
    siteRoot,
    workers,
  })],
});
