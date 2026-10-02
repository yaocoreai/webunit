import type { DocumentRenderPayload } from '@/platform/theme/render/model';
import type { ResponseDependencyCollector } from '@/platform/runtime/response-dependencies';
import type { WebRuntime } from './runtime';
import type { RequestSignalsResolver } from '@/platform/runtime/request-signals';
import type { ServerEnvironment } from '@/platform/runtime/server-environment';
import { bindDocumentRuntime } from '@/platform/runtime/document-runtime';
import { finalizeDocumentResponse } from '@/platform/runtime/finalize-document-response';

export type EditorPreview =
  | { type: 'section' }
  | { type: 'template'; activeSection?: string };

export type RenderContext =
  | { environment: 'production' }
  | { environment: 'public-preview' }
  | {
      environment: 'editor-preview';
      preview: EditorPreview;
    };

export type RenderRuntime = Readonly<{
  request: Readonly<{
    requestId: string;
    signal: AbortSignal;
    responseDependencies: ResponseDependencyCollector;
    signals: RequestSignalsResolver;
    environment: ServerEnvironment;
  }>;
  web: WebRuntime;
  payload: DocumentRenderPayload;
  context: RenderContext;
}>;

const renderRuntimeKey = Symbol('platform.render-runtime');
type RuntimeLocals = { [renderRuntimeKey]?: RenderRuntime };

export function bindRenderRuntime(locals: object, runtime: RenderRuntime) {
  Object.defineProperty(locals, renderRuntimeKey, { configurable: false, enumerable: false, value: runtime, writable: false });
  bindDocumentRuntime(locals, {
    finalize: (response, request, development) =>
      finalizeDocumentResponse(response, request, runtime, development),
  });
}

export function readRenderRuntime(locals: object) {
  return (locals as RuntimeLocals)[renderRuntimeKey];
}

export function useRenderRuntime(locals: object): RenderRuntime {
  const runtime = readRenderRuntime(locals);
  if (!runtime) throw new Error('RenderRuntime is not bound to Astro.locals');
  return runtime;
}
