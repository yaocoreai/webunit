export async function createPublicHttpErrorResponse(request: Request, status: number, options: Readonly<{ requestId?: string; allow?: string }> = {}) {
  const responseStatus = normalizeResponseStatus(status);
  const document = renderNeutralHttpErrorDocument(responseStatus, options.requestId);
  const headers = createErrorHeaders(options.requestId, options.allow);
  return new Response(request.method === 'HEAD' ? null : document, { status: responseStatus, headers });
}

export function createUnhandledErrorResponse(request: Request, requestId: string) {
  const acceptsHtml = request.headers.get('accept')?.includes('text/html') || request.headers.get('sec-fetch-dest') === 'document';
  if (acceptsHtml) return createPublicHttpErrorResponse(request, 500, { requestId });
  const headers = createErrorHeaders(requestId);
  headers.set('content-type', 'application/json; charset=utf-8');
  return Promise.resolve(new Response(request.method === 'HEAD' ? null : JSON.stringify({ error: { code: 'internal_error', requestId } }), { status: 500, headers }));
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function normalizeResponseStatus(status: number) {
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

function createErrorHeaders(requestId?: string, allow?: string) {
  const headers = new Headers({
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    'content-type': 'text/html; charset=utf-8',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex',
  });
  if (requestId) headers.set('x-request-id', requestId);
  if (allow) headers.set('allow', allow);
  return headers;
}

function renderNeutralHttpErrorDocument(status: number, requestId?: string) {
  const request = requestId ? `<p>Request ID: <code>${escapeHtml(requestId)}</code></p>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${status} Error</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,sans-serif;color:#171717;background:#fafafa}main{text-align:center}h1{margin:0;font-size:clamp(4rem,20vw,9rem);line-height:1}p{color:#525252}code{overflow-wrap:anywhere}</style></head><body><main><h1>${status}</h1><p>Something went wrong.</p>${request}</main></body></html>`;
}
