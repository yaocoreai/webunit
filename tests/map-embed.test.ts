import assert from 'node:assert/strict';
import test from 'node:test';
import { safeMapEmbedUrl } from '@/platform/theme/render/map-embed';

test('accepts bounded Google Maps embed URLs', () => {
  assert.equal(safeMapEmbedUrl('https://www.google.com/maps/embed?pb=place'), 'https://www.google.com/maps/embed?pb=place');
  assert.equal(safeMapEmbedUrl('https://maps.google.com/maps/embed?q=Shanghai'), 'https://maps.google.com/maps/embed?q=Shanghai');
});

test('rejects arbitrary or malformed embed URLs', () => {
  assert.equal(safeMapEmbedUrl('https://example.com/maps/embed?pb=place'), undefined);
  assert.equal(safeMapEmbedUrl('https://www.google.com/maps?pb=place'), undefined);
  assert.equal(safeMapEmbedUrl('javascript:alert(1)'), undefined);
  assert.equal(safeMapEmbedUrl('https://www.google.com/maps/embed'), undefined);
});
