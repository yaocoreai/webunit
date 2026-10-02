import type { ContentSource } from './contracts';
import type { ContentDependencyRegistrar, RequestContext } from '@/platform/theme/runtime/request-context';
import type { RequestSignalsResolver } from '@/platform/runtime/request-signals';
import type { ServerEnvironment } from '@/platform/runtime/server-environment';
import type { PlatformExecutionContext } from '@/platform/runtime/execution-context';

export type ContentsRuntime = Omit<RequestContext, 'locale' | 'domainHost'> & Readonly<{
  locale: string;
  dependency: ContentDependencyRegistrar;
  executionContext?: PlatformExecutionContext;
}>;

export type ContentsProvider = Readonly<{
  kind: 'datas' | 'function';
  load(input: Readonly<{
    runtime: ContentsRuntime;
    signals: RequestSignalsResolver;
    environment: ServerEnvironment;
  }>): Promise<ContentSource>;
}>;

export type SourceDefinition = Readonly<{
  contents: ContentsProvider;
}>;
