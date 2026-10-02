import { resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { build } from 'vite';

const target = process.argv[2];
if (!['node', 'container'].includes(target ?? '')) throw new Error('Worker build target must be node or container');
const root = resolve(import.meta.dirname, '..');
await build({
  configFile: false,
  root,
  resolve: { alias: [
    { find: /^@\/function\/infrastructure\/runtime$/, replacement: resolve(root, `src/function/infrastructure/runtime.${target}.ts`) },
    { find: /^@\/platform\/runtime\/function-identity$/, replacement: resolve(root, `src/platform/runtime/function-identity.${target}.ts`) },
    { find: /^@\/platform\/theme$/, replacement: resolve(root, 'src/platform/theme/facade.ts') },
    { find: /^@\/platform\/datas$/, replacement: resolve(root, 'src/platform/theme/datas/facade.ts') },
    { find: '@', replacement: resolve(root, 'src') },
  ] },
  plugins: [{
    name: 'worker-ts-directory-resolution',
    enforce: 'pre',
    resolveId(source) {
      const candidate = source.startsWith('@/')
        ? resolve(root, 'src', source.slice(2))
        : source.startsWith(resolve(root, 'src'))
          ? source
          : undefined;
      if (!candidate) return;
      if (existsSync(candidate) && statSync(candidate).isDirectory()) {
        const index = resolve(candidate, 'index.ts');
        if (existsSync(index)) return index;
      }
    },
  }],
  build: {
    emptyOutDir: false,
    target: 'node24',
    ssr: true,
    outDir: resolve(root, 'dist/server'),
    rollupOptions: {
      input: resolve(root, `src/platform/runtime/${target}/worker-entry.ts`),
      external: (id) => id.endsWith('.astro') || id.endsWith('.css'),
      output: { entryFileNames: 'worker-entry.mjs', chunkFileNames: 'worker-chunks/[name]-[hash].mjs' },
    },
  },
  logLevel: 'warn',
});
if (target === 'node') {
  await writeFile(
    resolve(root, 'dist/server/node-entry.mjs'),
    "await import('./entry.mjs');\nawait import('./worker-entry.mjs');\n",
  );
}
console.info(`Generated explicit ${target} Worker entry`);
