import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import test from 'node:test';
import { assertOriginsAvailable } from '../scripts/ports.mjs';

test('development port preflight rejects occupied and duplicate origins', async (context) => {
  const server = createServer();
  try {
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EPERM') { context.skip('sandbox disallows local TCP listen'); return; }
    throw error;
  }
  const address = server.address(); assert.ok(address && typeof address === 'object');
  await assert.rejects(() => assertOriginsAvailable([['Web', `http://localhost:${address.port}`]]), /already in use/);
  await assert.rejects(() => assertOriginsAvailable([['Web', 'http://localhost:31000'], ['Admin', 'http://localhost:31000']]), /share port/);
  await assert.rejects(() => assertOriginsAvailable([['Web', 'http://localhost:31001'], ['Theme', 'http://localhost:31001']]), /share port/);
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
