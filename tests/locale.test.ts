import assert from 'node:assert/strict';
import test from 'node:test';
import { readRequestLocale, validateLocale } from '@/platform/runtime/locale';

test('Accept-Language wildcard and malformed candidates fall back safely', () => {
  assert.equal(readRequestLocale(new Request('https://example.com', { headers: { 'accept-language': '*' } })), 'en-us');
  assert.equal(readRequestLocale(new Request('https://example.com', { headers: { 'accept-language': 'bad_locale, *;q=0.5' } })), 'en-us');
});

test('Accept-Language uses the highest quality valid candidate', () => {
  const request = new Request('https://example.com', { headers: { 'accept-language': 'en-us;q=0.4, zh-cn;q=0.9, invalid;q=1' } });
  assert.equal(readRequestLocale(request), 'zh-cn');
});

test('explicit locale remains strict and is canonicalized', () => {
  assert.equal(readRequestLocale(new Request('https://example.com', { headers: { 'x-platform-locale': 'zh-cn' } })), 'zh-cn');
  assert.throws(() => readRequestLocale(new Request('https://example.com', { headers: { 'x-platform-locale': '*' } })), /Invalid locale/);
  assert.throws(() => validateLocale('not_a_locale'), /Invalid locale/);
});
