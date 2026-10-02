import { readdir } from 'node:fs/promises';

const requiredThemeEntries = Object.freeze([
  'layout/setting.ts',
  'layout/render.astro',
  'templates',
  'sections',
]);

export async function resolveRenderer(siteRoot, mode) {
  if (mode && mode !== 'theme') {
    throw new Error('PLATFORM_RENDERER must be theme');
  }
  return await inspectThemeImplementation(siteRoot);
}

export async function inspectThemeImplementation(siteRoot) {
  const themeRoot = new URL('src/theme/', siteRoot);
  const rootEntries = await readdir(themeRoot, { withFileTypes: true }).catch((error) => {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  });
  if (!rootEntries) {
    throw new Error('Theme renderer requires src/theme');
  }

  const missing = [];
  for (const entry of requiredThemeEntries) {
    const target = new URL(entry, themeRoot);
    const parent = new URL('./', target);
    const name = target.pathname.split('/').filter(Boolean).at(-1);
    const entries = await readdir(parent, { withFileTypes: true }).catch((error) => {
      if (error?.code === 'ENOENT') return [];
      throw error;
    });
    if (!entries.some((candidate) => candidate.name === name)) missing.push(entry);
  }
  if (missing.length) {
    throw new Error(`Theme implementation is incomplete: ${missing.join(', ')}`);
  }

  const datasAvailable = await readdir(new URL('datas/', themeRoot), { withFileTypes: true })
    .then((entries) => entries.some((entry) => entry.isFile() && entry.name === 'index.ts'))
    .catch((error) => {
      if (error?.code === 'ENOENT') return false;
      throw error;
    });
  return Object.freeze({ kind: 'theme', srcDir: './src/platform/theme', datasAvailable });
}
