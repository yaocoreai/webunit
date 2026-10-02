import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeJsonForHtml } from '@/platform/theme/render/html-json';

test('HTML JSON serialization cannot terminate a script element', () => {
  const serialized = serializeJsonForHtml({
    code: '<script>globalThis.analytics=true</script>',
    requiredConsent: ['analytics'],
  });

  assert.doesNotMatch(serialized, /</);
  assert.match(serialized, /\\u003cscript>/);
  assert.deepEqual(JSON.parse(serialized), {
    code: '<script>globalThis.analytics=true</script>',
    requiredConsent: ['analytics'],
  });
});
