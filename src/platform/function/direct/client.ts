// Platform-owned adapters for direct SSR and browser Function invocation.
import { readBoundedResponseJson } from '@/platform/http/read-body';
import { hasMediaType } from '@/platform/http/media-type';
import type { OperationResult } from "@/function/common/app/entry";
import { createFunctionHttpRequest } from '@/platform/function/http/request';
import { createGeneratedFunctionApi } from '@/platform/generated/function-api/direct';
import { createGeneratedPublicFunctionApi } from '@/platform/generated/function-api/public';
import type {
  FunctionCallOptions,
  FunctionInvoker,
  FunctionRouteDirectOutputMap,
  FunctionRouteHttpOutputMap,
} from '@/platform/generated/function-api/types';
import {
  type DirectResponseEffectsHandler,
  unwrapDirectOperationResult,
} from './response-effects';

export type { FunctionCallOptions, FunctionInvoker } from '@/platform/generated/function-api/types';
export type DirectFunctionInvoke = (name: string, input: unknown, options?: FunctionCallOptions) => Promise<OperationResult>;

type BrowserFunctionApiOptions = Readonly<{
  origin?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}>;

export function createDirectFunctionApi(
  invokeRoute: DirectFunctionInvoke,
  options: Readonly<{ onResponseEffects?: DirectResponseEffectsHandler }> = {},
) {
  const invoke: FunctionInvoker<FunctionRouteDirectOutputMap> = async (name, input, callOptions) => {
    const result = await invokeRoute(name, input, callOptions);
    return unwrapDirectOperationResult(result, options.onResponseEffects) as FunctionRouteDirectOutputMap[typeof name];
  };
  return createGeneratedFunctionApi(invoke);
}

export function createBrowserFunctionApi(options: BrowserFunctionApiOptions = {}) {
  const origin = options.origin ?? globalThis.location?.origin;
  if (!origin) throw new Error('createBrowserFunctionApi() requires an origin');
  const fetcher = options.fetch ?? globalThis.fetch;
  const invoke: FunctionInvoker<FunctionRouteHttpOutputMap> = async (name, input, callOptions) => {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(new DOMException('Function timed out', 'TimeoutError')), options.timeoutMs ?? 15_000);
    const signal = callOptions?.signal ? AbortSignal.any([callOptions.signal, timeout.signal]) : timeout.signal;
    try {
      const transport = createFunctionHttpRequest(origin, String(name), input, {
        headers: callOptions?.headers,
        signal,
      });
      const response = await fetcher(transport.url, transport.init);
      if (!hasMediaType(response.headers, 'application/json')) {
        if (!response.ok) throw new FunctionCallError(response.status, 'function_failed', `Function ${name} failed`, response.headers.get('x-request-id') ?? undefined);
        clearTimeout(timer);
        return response as FunctionRouteHttpOutputMap[typeof name];
      }
      const body = await readBoundedResponseJson(response, 8_000_000) as { data?: unknown; error?: { code?: string; message?: string; details?: unknown }; meta?: { requestId?: string } };
      if (!response.ok) throw new FunctionCallError(response.status, body.error?.code ?? 'function_failed', body.error?.message ?? `Function ${name} failed`, body.meta?.requestId, body.error?.details);
      if (!Object.hasOwn(body, 'data')) throw new Error(`Function ${name} returned an invalid response`);
      return body.data as FunctionRouteHttpOutputMap[typeof name];
    } finally {
      clearTimeout(timer);
    }
  };
  return createGeneratedPublicFunctionApi(invoke);
}

export class FunctionCallError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}
