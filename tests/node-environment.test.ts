import assert from 'node:assert/strict';
import test from 'node:test';

import { createNodeEnvironment } from '../scripts/node-environment.mjs';

test('Node environment provides data defaults without controlling worker lifecycle', () => {
  const environment = createNodeEnvironment({});
  assert.equal(environment.NODE_ENV, 'development');
  assert.match(environment.WEB_DATABASE_FILE, /\/\.data\/node\/site\.sqlite$/);
  assert.equal(
    environment.FUNCTION_ORIGINS,
    'http://localhost:3000,http://localhost:3001',
  );
  assert.equal('ADMIN_ORIGIN' in environment, false);
});

test('Node environment preserves the standard application mode', () => {
  assert.equal(createNodeEnvironment({ NODE_ENV: 'test' }).NODE_ENV, 'test');
});
