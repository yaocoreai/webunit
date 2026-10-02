import { createSiteClient } from '@/platform/theme/source/site-runtime';
import type { DocumentRenderPayload } from '@/platform/theme/render/model';
import { readContentTimeoutMs, readTrustProxy } from '@/platform/runtime/runtime-config';
import { functionDeployment } from '@/platform/runtime/function-identity';
import { createRequestSignalsResolver } from '@/platform/runtime/request-signals';
import { ResponseDependencyCollector } from '@/platform/runtime/response-dependencies';
import { resolveServerEnvironment, type ServerEnvironment } from '@/platform/runtime/server-environment';
import { createLazyPublicContent } from '@/platform/theme/content/lazy';
import type { ContentsProvider } from '@/platform/theme/source/definition';
import { ContentSourceError } from '@/platform/theme/source/contracts';
import { readRequestLocale } from '@/platform/runtime/locale';
import { ApiError } from '@/platform/runtime/error';
import { connectWebCache } from '@/platform/runtime/cache';
import type { PlatformExecutionContext } from '@/platform/runtime/execution-context';

export async function createRequestRuntime(
  _request: Request,
  contents: ContentsProvider,
  runtimeEnvironment?: Readonly<Record<string, unknown>>,
  executionContext?: PlatformExecutionContext,
) {
  const environment: ServerEnvironment = await resolveServerEnvironment(runtimeEnvironment);
  const cache = connectWebCache(environment, runtimeEnvironment);
  const responseDependencies = new ResponseDependencyCollector();
  const signals = createRequestSignalsResolver(_request, functionDeployment, readTrustProxy(environment));
  const requestId = crypto.randomUUID();
  const locale = readRequestLocale(_request);
  let timeoutSignal: AbortSignal | undefined;
  let contentSignal: AbortSignal | undefined;
  const getContentSignal = () => contentSignal ??= AbortSignal.any([
    _request.signal,
    timeoutSignal ??= AbortSignal.timeout(readContentTimeoutMs(environment)),
  ]);
  const withinDeadline = async <T>(operation: Promise<T>, path: string): Promise<T> => {
    const signal = getContentSignal();
    if (signal.aborted) throwContentAbort(path);
    let abort: (() => void) | undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
    });
    try { return await Promise.race([operation, aborted]); }
    catch (error) {
      if (signal.aborted) throwContentAbort(path);
      if (error instanceof ContentSourceError) {
        throw new ApiError(
          error.kind === 'cancelled' || error.kind === 'deadline_exceeded' ? 'abort' : 'response',
          contentSourceStatus(error.kind),
          path,
          undefined,
          error.code,
          error.retryAfterMs === undefined ? undefined : { retryAfterMs: error.retryAfterMs },
        );
      }
      throw error;
    } finally {
      if (abort) signal.removeEventListener('abort', abort);
    }
  };
  const throwContentAbort = (path: string): never => {
    if (timeoutSignal?.aborted && !_request.signal.aborted) throw new ApiError('abort', 504, path);
    throw new ApiError('abort', 499, path);
  };
  let sourcePromise: ReturnType<ContentsProvider['load']> | undefined;
  const loadSource = () => sourcePromise ??= (async () => contents.load({ signals, environment, runtime: {
    request: _request, url: new URL(_request.url), requestId, signal: getContentSignal(), signals, locale, executionContext,
    dependency: (dependency) => responseDependencies.addApi(dependency),
  } }))();
  const loadSourceWithinDeadline = () => withinDeadline(loadSource(), 'content:source');
  const site = {
    resolveRoute: async (input: Parameters<import('@/platform/theme/source/contracts').SiteContentSource['resolveRoute']>[0]) => withinDeadline((await loadSourceWithinDeadline()).site.resolveRoute({ ...input, signal: getContentSignal() }), input.path),
    resolveError: async (input: Parameters<import('@/platform/theme/source/contracts').SiteContentSource['resolveError']>[0]) => withinDeadline((await loadSourceWithinDeadline()).site.resolveError({ ...input, signal: getContentSignal() }), input.path),
    readManifest: async (input: Parameters<import('@/platform/theme/source/contracts').SiteContentSource['readManifest']>[0]) => withinDeadline((await loadSourceWithinDeadline()).site.readManifest({ ...input, signal: getContentSignal() }), '/manifest.webmanifest'),
    readSiteFile: async (input: Parameters<import('@/platform/theme/source/contracts').SiteContentSource['readSiteFile']>[0]) => withinDeadline((await loadSourceWithinDeadline()).site.readSiteFile({ ...input, signal: getContentSignal() }), input.path),
    listSitemaps: async (input: Parameters<import('@/platform/theme/source/contracts').SiteContentSource['listSitemaps']>[0]) => withinDeadline((await loadSourceWithinDeadline()).site.listSitemaps({ ...input, signal: getContentSignal() }), '/sitemap.xml'),
    findSitemap: async (input: Parameters<import('@/platform/theme/source/contracts').SiteContentSource['findSitemap']>[0]) => withinDeadline((await loadSourceWithinDeadline()).site.findSitemap({ ...input, signal: getContentSignal() }), input.path),
  };
  const request = { requestId, signal: _request.signal, responseDependencies, signals } as const;
  return {
    environment,
    cache,
    request,
    responseDependencies,
    site: createSiteClient(site),
    createContentApi(context: Readonly<{ domainHost: string; locale: string }>, options: Readonly<{ registerDependencies?: boolean }> = {}) {
      let content: ReturnType<import('@/platform/theme/source/contracts').ContentSource['createPublicContent']> | undefined;
      const registerDependency = options.registerDependencies === false
        ? () => {}
        : (dependency: Parameters<ResponseDependencyCollector['addApi']>[0]) => responseDependencies.addApi(dependency);
      const load = async () => content ??= (await loadSourceWithinDeadline()).createPublicContent({ ...context, signal: getContentSignal(), registerDependency });
      return createLazyPublicContent(load, (operation) => withinDeadline(operation, 'content:query'));
    },
    createWebRuntime(payload: DocumentRenderPayload) {
      const context = {
        domainHost: payload.domain.host, locale: payload.locale, signal: _request.signal,
        registerDependency: (dependency: Parameters<ResponseDependencyCollector['addApi']>[0]) => responseDependencies.addApi(dependency),
      };
      const web = {
        domainHost: context.domainHost,
        locale: context.locale,
        content: this.createContentApi(context, { registerDependencies: false }),
        cache,
      } as const;
      return web;
    },
  } as const;
}

function contentSourceStatus(kind: string) {
  return {
    invalid_argument: 400,
    unauthenticated: 401,
    permission_denied: 403,
    not_found: 404,
    conflict: 409,
    failed_precondition: 412,
    resource_exhausted: 429,
    cancelled: 499,
    deadline_exceeded: 504,
    unavailable: 503,
    internal: 500,
  }[kind] ?? 500;
}
