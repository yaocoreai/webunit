export type ApiErrorKind = 'abort' | 'network' | 'response' | 'contract';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    readonly path: string,
    readonly requestId?: string,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(`CMS API ${kind}: ${status} ${path}`);
  }

  get retryable() {
    return this.kind === 'network' || this.kind === 'abort' || this.status >= 500;
  }
}
