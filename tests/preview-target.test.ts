import assert from 'node:assert/strict';
import test from 'node:test';
import { createThemePreviewEnvironment } from '@/platform/theme/preview/environment';
import { parsePreviewRequest } from '@/platform/theme/preview/target';

const environment = { viewportWidth: 1600, viewportHeight: 900, canvasWidth: 1600, canvasHeight: 900, pixelRatio: 1 };

test('preview accepts section and template targets only', () => {
  assert.deepEqual(parsePreviewRequest(new URL('https://preview.local/_preview_?type=section&key=hero-banner')), {
    value: { target: { type: 'section', key: 'hero-banner' }, presentation: { content: 'defaults', environment } },
  });
  assert.deepEqual(parsePreviewRequest(new URL('https://preview.local/_preview_?type=template&key=page&content=sections')), {
    value: { target: { type: 'template', key: 'page' }, presentation: { content: 'sections', environment } },
  });
  assert.deepEqual(parsePreviewRequest(new URL('https://preview.local/_preview_?type=page')), { error: 'Invalid preview target' });
  assert.equal('error' in parsePreviewRequest(new URL('https://preview.local/_preview_?type=template&key=page')), true);
  assert.equal('error' in parsePreviewRequest(new URL('https://preview.local/_preview_?type=template&key=page&content=defaults')), true);
});

test('template slots presentation accepts one optional selected slot', () => {
  assert.deepEqual(parsePreviewRequest(new URL('https://preview.local/_preview_?type=template&key=page&content=slots&viewport=large')), {
    value: { target: { type: 'template', key: 'page' }, presentation: { content: 'slots', viewport: 'large', environment: { ...environment, viewportId: 'large' } } },
  });
  assert.deepEqual(parsePreviewRequest(new URL('https://preview.local/_preview_?type=template&key=page&content=slots&viewport=desktop&slot=page.main')), {
    value: { target: { type: 'template', key: 'page' }, presentation: { content: 'slots', viewport: 'desktop', activeSlot: 'page.main', environment: { ...environment, viewportId: 'desktop' } } },
  });
  assert.equal('error' in parsePreviewRequest(new URL('https://preview.local/_preview_?type=template&key=page&content=slots')), true);
  assert.equal('value' in parsePreviewRequest(new URL('https://preview.local/_preview_?type=template&key=page&content=slots&viewport=wide')), true);
  assert.equal('error' in parsePreviewRequest(new URL('https://preview.local/_preview_?type=template&key=page&content=sections&slot=page.main')), true);
  assert.equal('value' in parsePreviewRequest(new URL('https://preview.local/_preview_?type=template&key=page&content=sections&viewport=desktop')), true);
  assert.equal('error' in parsePreviewRequest(new URL('https://preview.local/_preview_?type=section&key=hero-banner&content=defaults')), true);
  assert.equal('error' in parsePreviewRequest(new URL('https://preview.local/_preview_?type=template&key=page&type=section')), true);
});

test('preview environment accepts positive explicit dimensions and rejects invalid values', () => {
  assert.deepEqual(parsePreviewRequest(new URL('https://preview.local/_preview_?type=section&key=hero&viewport=phone&vw=390&vh=844&cw=320&ch=600&dpr=3')), {
    value: { target: { type: 'section', key: 'hero' }, presentation: { content: 'defaults', environment: { viewportId: 'phone', viewportWidth: 390, viewportHeight: 844, canvasWidth: 320, canvasHeight: 600, pixelRatio: 3 } } },
  });
  assert.equal('error' in parsePreviewRequest(new URL('https://preview.local/_preview_?type=section&key=hero&vw=0')), true);
  assert.equal('error' in parsePreviewRequest(new URL('https://preview.local/_preview_?type=section&key=hero&vw=NaN')), true);
});

test('fixed preview keeps its design width below 1500 and expands above 1500', () => {
  const mobile = parsePreviewRequest(new URL('https://preview.local/_preview_?type=section&key=hero&viewport=mobile&vw=375&vh=667&cw=375&ch=667'));
  assert.ok('value' in mobile);
  const mobileEnvironment = createThemePreviewEnvironment(
    mobile.value,
    { strategy: 'fixed', width: 1500 },
    1,
  );
  assert.equal(mobileEnvironment.viewport.width, 1500);
  assert.equal(mobileEnvironment.viewport.orientation, 'portrait');
  assert.equal(mobileEnvironment.canvas.availableWidth, 375);

  const large = parsePreviewRequest(new URL('https://preview.local/_preview_?type=section&key=hero&viewport=large&vw=1920&vh=1080&cw=1920&ch=1080'));
  assert.ok('value' in large);
  assert.equal(
    createThemePreviewEnvironment(large.value, { strategy: 'fixed', width: 1500 }, 1).viewport.width,
    1920,
  );
  assert.equal(
    createThemePreviewEnvironment(mobile.value, { strategy: 'responsive' }, 1).viewport.width,
    375,
  );
});
