declare module 'cloudflare:workers' {
  export const env: Readonly<Record<string, unknown>>;
  export const cache: Readonly<{
    purge(input: Readonly<{ tags?: readonly string[]; pathPrefixes?: readonly string[]; purgeEverything?: true }>): Promise<Readonly<{
      success: boolean;
      errors: readonly Readonly<{ code: number; message: string }>[];
    }>>;
  }>;
  export class DurableObject<TEnv = unknown> {
    constructor(state: unknown, env: TEnv);
  }
}

declare const __PLATFORM_WEB_FUNCTION__: boolean;
