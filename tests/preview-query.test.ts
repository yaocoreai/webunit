import assert from 'node:assert/strict';
import test from 'node:test';
import { parseThemePreviewQuery } from '@/platform/theme/preview/query';

test('theme preview query accepts one opaque id only', () => {
  assert.deepEqual(parseThemePreviewQuery(new URL('https://northstar.local/')), { present: false });
  const themeId = '93df64c4-d19f-4fb7-9f58-ff8202710a83';
  const ticket = '0123456789abcdef0123456789abcdef';
  assert.deepEqual(parseThemePreviewQuery(new URL(`https://northstar.local/?preview=${themeId}&ticket=${ticket}`)), { present: true, value: { themeId, ticket } });
  assert.equal('error' in parseThemePreviewQuery(new URL('https://northstar.local/?preview=')), true);
  assert.equal('error' in parseThemePreviewQuery(new URL(`https://northstar.local/?preview=${themeId}`)), true);
  assert.equal('error' in parseThemePreviewQuery(new URL(`https://northstar.local/?ticket=${ticket}`)), true);
  assert.equal('error' in parseThemePreviewQuery(new URL(`https://northstar.local/?preview=${themeId}&preview=${themeId}&ticket=${ticket}`)), true);
  assert.equal('error' in parseThemePreviewQuery(new URL('https://northstar.local/?preview=%2Fadmin')), true);
});
