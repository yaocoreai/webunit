import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { assertProjectPageBoundaries } from '@/platform/build/routes-integration.mjs';
import { resolveRenderer } from '@/platform/build/renderer.mjs';

async function workspace(context: test.TestContext) {
  const path = await mkdtemp(join(tmpdir(), 'webunit-platform-build-'));
  context.after(() => rm(path, { recursive: true, force: true }));
  return new URL('./', pathToFileURL(`${path}/`));
}

test('Renderer selection rejects a missing Theme instead of allowing Functions-only', async (context) => {
  const root = await workspace(context);
  await assert.rejects(resolveRenderer(root, 'theme'), /requires src\/theme/);
});

test('Renderer selection requires Theme', async (context) => {
  const root = await workspace(context);
  await assert.rejects(resolveRenderer(root, undefined), /requires src\/theme/);
  await assert.rejects(resolveRenderer(root, 'web'), /must be theme/);
  await assert.rejects(resolveRenderer(root, 'none'), /must be theme/);
});

test('Theme implementation adapter rejects partial packages and detects optional Datas', async (context) => {
  const root = await workspace(context);
  await mkdir(new URL('src/theme/layout/', root), { recursive: true });
  await assert.rejects(
    resolveRenderer(root, 'theme'),
    /Theme implementation is incomplete/,
  );

  await Promise.all([
    writeFile(new URL('src/theme/layout/setting.ts', root), 'export default {};\n'),
    writeFile(new URL('src/theme/layout/render.astro', root), '---\n---\n'),
    mkdir(new URL('src/theme/templates/', root), { recursive: true }),
    mkdir(new URL('src/theme/sections/', root), { recursive: true }),
  ]);
  assert.deepEqual(await resolveRenderer(root, 'theme'), {
    kind: 'theme',
    srcDir: './src/platform/theme',
    datasAvailable: false,
  });

  await mkdir(new URL('src/theme/datas/', root), { recursive: true });
  await writeFile(new URL('src/theme/datas/index.ts', root), 'export default {};\n');
  assert.deepEqual(await resolveRenderer(root, 'theme'), {
    kind: 'theme',
    srcDir: './src/platform/theme',
    datasAvailable: true,
  });
});

test('Project Pages cannot shadow Platform or Theme protocol roots', async (context) => {
  const root = await workspace(context);
  await mkdir(new URL('src/web/pages/_/', root), { recursive: true });
  await writeFile(new URL('src/web/pages/_preview_.astro', root), '---\n---\n');
  await assert.rejects(
    assertProjectPageBoundaries(root),
    /Platform routes: _/,
  );

  await rm(new URL('src/web/pages/_/', root), { recursive: true });
  await writeFile(new URL('src/web/pages/index.astro', root), '---\n---\n');
  await assert.doesNotReject(assertProjectPageBoundaries(root));
});
