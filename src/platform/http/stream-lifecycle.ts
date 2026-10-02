type StreamLifecycleOptions = Readonly<{
  onFinish: () => void;
  onCancel?: (reason: unknown) => void;
}>;

/** Keep request resources alive until the response body ends or the consumer cancels it. */
export function withStreamLifecycle(body: ReadableStream<Uint8Array>, options: StreamLifecycleOptions): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    options.onFinish();
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (chunk.done) {
          finish();
          controller.close();
          return;
        }
        controller.enqueue(chunk.value);
      } catch (error) {
        finish();
        controller.error(error);
      }
    },
    async cancel(reason) {
      options.onCancel?.(reason);
      try { await reader.cancel(reason); }
      finally { finish(); }
    },
  });
}

/** Cancel a body that the HTTP contract forbids forwarding, so its producer cannot keep resources alive. */
export function discardResponseBody(body: ReadableStream<Uint8Array> | null, reason: unknown) {
  if (body) void body.cancel(reason).catch(() => {});
}
