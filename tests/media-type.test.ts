import assert from 'node:assert/strict';
import test from 'node:test';
import { hasMediaType, isJsonMediaType, readMediaType } from '@/platform/http/media-type';

test('media type parsing is case-insensitive, parameter-aware and rejects prefix lookalikes', () => {
  assert.equal(readMediaType(new Headers({ 'content-type': 'Application/JSON; Charset=UTF-8' })), 'application/json');
  assert.equal(hasMediaType(new Headers({ 'content-type': 'application/jsonp' }), 'application/json'), false);
  assert.equal(isJsonMediaType(new Headers({ 'content-type': 'application/problem+json; charset=utf-8' })), true);
  assert.equal(isJsonMediaType(new Headers({ 'content-type': 'text/json' })), false);
});
