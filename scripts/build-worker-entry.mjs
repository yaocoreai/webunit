import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'vite';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const serverDirectory = resolve(appRoot, 'dist/workers/server');
const outputFile = resolve(serverDirectory, 'webunit-entry.mjs');

await build({
  configFile: false,
  root: appRoot,
  plugins: [{
    name: 'webunit-astro-entry',
    resolveId(id) {
      if (id === 'virtual:webunit-astro-entry') return { id: './entry.mjs', external: true };
    },
  }],
  resolve: {
    alias: {
      '@/function/infrastructure/runtime': resolve(appRoot, 'src/function/infrastructure/runtime.workers.ts'),
      '@/platform/runtime/function-identity': resolve(appRoot, 'src/platform/runtime/function-identity.workers.ts'),
      '@': resolve(appRoot, 'src'),
    },
  },
  build: {
    emptyOutDir: false,
    target: 'esnext',
    ssr: true,
    outDir: serverDirectory,
    rollupOptions: {
      input: resolve(appRoot, 'src/platform/runtime/workers/entry.ts'),
      external: ['cloudflare:workers'],
      output: { entryFileNames: 'webunit-entry.mjs', chunkFileNames: 'chunks/webunit-[name]-[hash].mjs' },
    },
  },
  logLevel: 'warn',
});

const wranglerPath = resolve(serverDirectory, 'wrangler.json');
const wrangler = JSON.parse(await readFile(wranglerPath, 'utf8'));
wrangler.main = 'webunit-entry.mjs';
await writeFile(wranglerPath, `${JSON.stringify(wrangler)}\n`);

const output = await readFile(outputFile, 'utf8');
for (const [handler, pattern] of [
  ['fetch', /\bfetch\s*\(/],
  ['queue', /\bqueue\s*:/],
  ['scheduled', /\bscheduled\s*:/],
]) {
  if (!pattern.test(output)) throw new Error(`Generated Worker entry is missing ${handler}`);
}
console.log('Generated unified Worker entry with fetch, queue, and scheduled handlers.');
