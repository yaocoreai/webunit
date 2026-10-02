import { discardResponseBody } from './stream-lifecycle';

/** Normalize the Fetch body rules that must be identical in every deployment runtime. */
export function normalizeResponseBody(response: Response, method: string) {
  const headers = new Headers(response.headers);
  const bodyForbidden = method === 'HEAD' || response.status === 204 || response.status === 205 || response.status === 304;
  if (bodyForbidden) discardResponseBody(response.body, new DOMException('HTTP response body discarded', 'AbortError'));
  if (response.status === 204 || response.status === 205) {
    headers.delete('content-length');
    headers.delete('content-range');
  }
  return { body: bodyForbidden ? null : response.body, headers } as const;
}
