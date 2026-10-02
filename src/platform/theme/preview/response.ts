export function createPreviewHeaders(editorOrigin: string) {
  return new Headers({
    'cache-control': 'no-store',
    'referrer-policy': 'same-origin',
    'x-robots-tag': 'noindex, nofollow',
    'content-security-policy': `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; form-action 'self'; base-uri 'none'; frame-ancestors ${editorOrigin}`,
  });
}

export function createPreviewResponse(editorOrigin: string, body: BodyInit | null, status: number, headers?: HeadersInit) {
  const next = new Headers(headers);
  createPreviewHeaders(editorOrigin).forEach((value, key) => next.set(key, value));
  return new Response(body, { status, headers: next });
}
