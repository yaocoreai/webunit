import assert from 'node:assert/strict';
import test from 'node:test';
import type { Database } from '@/function/common/capabilities/contracts';
import { observeDatabase } from '@/function/common/db/observability';

test('Database observability reports connection, failures and sanitized slow queries', async () => {
  const inner: Database = {
    prepare(query) {
      return {
        bind() { return this; },
        async first() { if (query.includes('fail')) throw new Error('database unavailable'); return null; },
        async all() { return { results: [] }; },
        async run() { return { success: true }; },
      };
    },
    async batch() { return []; },
  };
  const database = observeDatabase(inner, 0);
  await database.prepare('select   1').first();
  await assert.rejects(() => database.prepare('select fail').first());
  const diagnostics = database.diagnostics!();
  assert.equal(diagnostics.operations, 2);
  assert.equal(diagnostics.failures, 1);
  assert.equal(diagnostics.connected, false);
  assert.equal(diagnostics.recentSlowQueries[0]?.query, 'select fail');
});
