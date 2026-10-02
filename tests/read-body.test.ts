import assert from 'node:assert/strict';
import test from 'node:test';
import { BodyTooLargeError, readBoundedResponseJson } from '@/platform/http/read-body';

test('bounded response JSON rejects declared and streamed overflow', async () => {
  await assert.rejects(
    () => readBoundedResponseJson(new Response(null, { headers: { 'content-length': '101' } }), 100),
    BodyTooLargeError,
  );

  let cancelled = false;
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"value":"'));
      controller.enqueue(new Uint8Array(100));
    },
    cancel() { cancelled = true; },
  }));
  await assert.rejects(() => readBoundedResponseJson(response, 32), BodyTooLargeError);
  assert.equal(cancelled, true);
});

test('bounded response JSON parses one valid body', async () => {
  assert.deepEqual(await readBoundedResponseJson(Response.json({ data: true }), 1_000), { data: true });
});
