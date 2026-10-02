import assert from 'node:assert/strict';
import test from 'node:test';
import { createLazyPublicContent } from '@/platform/theme/content/lazy';

test('lazy public content reuses identical request-scoped operations', async () => {
  let calls = 0;
  const content = createLazyPublicContent(async () => ({
    asset: async () => null,
    menu: async () => null,
    module: () => ({
      findOne: async () => null,
      findFirst: async () => null,
      findMany: async () => { calls += 1; return { items: [], nextCursor: null }; },
      count: async () => 0,
      aggregate: async () => ({}),
    }),
  }));
  const query = { limit: 12 };
  const [first, second] = await Promise.all([
    content.module('blog').findMany(query),
    content.module('blog').findMany({ limit: 12 }),
  ]);
  assert.equal(first, second);
  assert.equal(calls, 1);
});
