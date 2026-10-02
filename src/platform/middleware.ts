import { defineMiddleware } from 'astro:middleware';
import { readDocumentRuntime } from '@/platform/runtime/document-runtime';
import { finalizeProtocolResponse } from '@/platform/runtime/finalize-document-response';

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    const response = await next();
    const runtime = readDocumentRuntime(context.locals);
    return runtime
      ? runtime.finalize(response, context.request, import.meta.env.DEV)
      : finalizeProtocolResponse(response, context.request.method);
  } catch (error) {
    if (context.request.signal.aborted) {
      return new Response(null, { status: 499, headers: { 'cache-control': 'no-store' } });
    }
    const requestId = crypto.randomUUID();
    console.error('Unhandled Web request error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const { createUnhandledErrorResponse } = await import('@/platform/http/error-response');
    return await createUnhandledErrorResponse(context.request, requestId);
  }
});
