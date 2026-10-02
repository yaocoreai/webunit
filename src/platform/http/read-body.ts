export class BodyTooLargeError extends Error {
  constructor() {
    super('Payload too large');
    this.name = 'BodyTooLargeError';
  }
}

export async function readBoundedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  return readBoundedStream(request.body, request.headers.get('content-length'), maxBytes);
}

export async function readBoundedResponseJson(response: Response, maxBytes: number): Promise<unknown> {
  const bytes = await readBoundedStream(response.body, response.headers.get('content-length'), maxBytes);
  if (!bytes.byteLength) return undefined;
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

async function readBoundedStream(body: ReadableStream<Uint8Array> | null, contentLength: string | null, maxBytes: number): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new TypeError('maxBytes must be a positive integer');
  const declaredLength = Number(contentLength ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new BodyTooLargeError();
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new BodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}
