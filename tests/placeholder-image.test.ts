import assert from 'node:assert/strict';
import test from 'node:test';
import { placeholderImage } from '../src/platform/theme/render/placeholder-image/index';

function decodePlaceholder(value: string): string {
  const prefix = 'data:image/svg+xml;charset=utf-8,';
  assert.ok(value.startsWith(prefix));
  return decodeURIComponent(value.slice(prefix.length));
}

test('placeholderImage returns an encoded semantic SVG image', async () => {
  const svg = decodePlaceholder(await placeholderImage('product', { width: 800 }));
  assert.match(svg, /width="800" height="1000"/);
  assert.match(svg, /viewBox="0 0 400 500"/);
  assert.match(svg, /<svg/);
});

test('placeholderImage uses semantic default ratios', async () => {
  const article = decodePlaceholder(await placeholderImage('article'));
  const avatar = decodePlaceholder(await placeholderImage('avatar'));
  assert.match(article, /width="1024" height="576"/);
  assert.match(avatar, /width="1024" height="1024"/);
});

test('placeholderImage applies explicit editorial colors', async () => {
  const svg = decodePlaceholder(await placeholderImage('collection', {
    backgroundColor: '#F8FAFC',
    foregroundColor: '#475569',
  }));
  assert.match(svg, /fill="#f8fafc"/);
  assert.match(svg, /fill="#475569"/);
});

test('placeholderImage keeps every SVG source compact', async () => {
  for (const name of ['image', 'product', 'avatar', 'article', 'collection'] as const) {
    assert.ok(decodePlaceholder(await placeholderImage(name)).length < 400, `${name} placeholder is too large`);
  }
});

test('placeholderImage rejects unsafe dimensions', async () => {
  await assert.rejects(() => placeholderImage('image', { width: 0 }), RangeError);
  await assert.rejects(() => placeholderImage('image', { height: 9000 }), RangeError);
  await assert.rejects(() => placeholderImage('image', { backgroundColor: 'red' }), TypeError);
});
