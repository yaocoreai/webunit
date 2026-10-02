export function applyRequestCacheSafety(headers: Headers, request: Request) {
  if (headers.has('set-cookie') || isPrivateRequest(request)) {
    forceNoStore(headers);
    return;
  }
  if (!headers.get('cache-control')?.toLowerCase().includes('no-store')) {
    appendVary(headers, ['Cookie', 'Authorization']);
  }
}

export function forceNoStore(headers: Headers) {
  headers.set('cache-control', 'no-store');
  headers.delete('cache-tag');
  headers.delete('cloudflare-cdn-cache-control');
  headers.delete('cdn-cache-control');
  headers.delete('surrogate-key');
}

function isPrivateRequest(request: Request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return true;
  if (request.headers.has('authorization')) return true;
  const cookies = request.headers.get('cookie');
  if (!cookies) return false;
  return cookies.split(';').some((part) => {
    const separator = part.indexOf('=');
    const name = part.slice(0, separator < 0 ? part.length : separator).trim();
    return name && name !== 'privacy_consent';
  });
}

function appendVary(headers: Headers, names: readonly string[]) {
  const values = new Set((headers.get('vary') ?? '').split(',').map((value) => value.trim()).filter(Boolean));
  for (const name of names) values.add(name);
  headers.set('vary', [...values].join(', '));
}
