import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareSlotPreviewRuntime } from '@/platform/theme/preview/slot-preview';

test('template slot preview combines template and active frame definitions', async () => {
  const runtime = await prepareSlotPreviewRuntime('page', 'desktop', 'page.main');
  assert.deepEqual(runtime, {
    templateKey: 'page',
    viewport: 'desktop',
    viewportWidth: 1600,
    activeSlot: 'page.main',
    slots: [
      { key: 'page.top', label: 'Top Area', available: true },
      { key: 'page.main', label: 'Page Content', available: true },
      { key: 'page.bottom', label: 'Bottom Area', available: true },
      { key: 'layout.header', label: 'Site header', available: true },
      { key: 'layout.footer', label: 'Site footer', available: true },
    ],
  });
});

test('template slot preview rejects unknown templates and slots', async () => {
  assert.equal(await prepareSlotPreviewRuntime('missing', 'desktop'), undefined);
  assert.equal(await prepareSlotPreviewRuntime('page', 'mobile', 'page.missing'), undefined);
  assert.deepEqual(await prepareSlotPreviewRuntime('advertisement', 'tablet'), {
    templateKey: 'advertisement',
    viewport: 'tablet',
    viewportWidth: 1600,
    slots: [
      { key: 'page.top', label: 'Top Area', available: true },
      { key: 'page.main', label: 'Page Content', available: true },
      { key: 'page.bottom', label: 'Bottom Area', available: true },
      { key: 'layout.header', label: 'Site header', available: true },
      { key: 'layout.footer', label: 'Site footer', available: true },
    ],
  });
});
