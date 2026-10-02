import type { ResponseCachePolicy } from '@/platform/cache/contracts';

type Env = Readonly<Record<string, unknown>>;
type CacheLimits = Readonly<{ mode: string; browser?: number; shared?: number; stale?: number }>;
const integer = (env: Env, key: string) => { const raw = env[key]; if (raw === undefined || raw === '') return undefined; if (typeof raw !== 'string' || !/^\d+$/.test(raw)) throw new Error(`${key} must be a non-negative integer`); return Number(raw); };
const limits = (env: Env, owner: 'CONTENT' | 'DOCUMENT', defaultMode: string): CacheLimits => ({ mode: String(env[`CMS_${owner}_CACHE_MODE`] ?? defaultMode), browser: integer(env, `CMS_${owner}_CACHE_BROWSER_TTL_SECONDS`), shared: integer(env, `CMS_${owner}_CACHE_SHARED_TTL_SECONDS`), stale: integer(env, `CMS_${owner}_CACHE_STALE_WHILE_REVALIDATE_SECONDS`) });
const clamp = (value: number, maximum?: number) => maximum === undefined ? value : Math.min(value, maximum);

export function applyContentCacheConfig(policy: ResponseCachePolicy, env: Env = import.meta.env ?? {}): ResponseCachePolicy {
  if (env.DEV === true) return { mode: 'no-store', visibility: policy.mode === 'no-store' ? policy.visibility : 'public', surrogateKeys: policy.surrogateKeys };
  const config = limits(env, 'CONTENT', 'public');
  if (config.mode !== 'public' && config.mode !== 'no-store') throw new Error('CMS_CONTENT_CACHE_MODE must be public or no-store');
  if (policy.mode === 'no-store' || config.mode === 'no-store') return { mode: 'no-store', visibility: policy.mode === 'no-store' ? policy.visibility : 'public', surrogateKeys: policy.surrogateKeys };
  return { ...policy, browserTtlSeconds: clamp(policy.browserTtlSeconds, config.browser), sharedTtlSeconds: clamp(policy.sharedTtlSeconds, config.shared), staleWhileRevalidateSeconds: clamp(policy.staleWhileRevalidateSeconds, config.stale) };
}

export function applyDocumentCacheConfig(
  content: ResponseCachePolicy,
  runtime: Readonly<{ context: Readonly<{ environment: 'production' | 'public-preview' | 'editor-preview' }> }>,
  env: Env = import.meta.env ?? {},
): ResponseCachePolicy {
  const preview = runtime.context.environment !== 'production';
  if (env.DEV === true) return { mode: 'no-store', visibility: preview ? 'preview' : 'public', surrogateKeys: content.surrogateKeys };
  const config = limits(env, 'DOCUMENT', 'auto');
  if (!['auto', 'public', 'no-store'].includes(config.mode)) throw new Error('CMS_DOCUMENT_CACHE_MODE must be auto, public, or no-store');
  if (content.mode === 'no-store' || config.mode === 'no-store' || preview) return { mode: 'no-store', visibility: preview ? 'preview' : 'public', surrogateKeys: content.surrogateKeys };
  return { ...content, browserTtlSeconds: clamp(content.browserTtlSeconds, config.browser), sharedTtlSeconds: clamp(content.sharedTtlSeconds, config.shared), staleWhileRevalidateSeconds: clamp(content.staleWhileRevalidateSeconds, config.stale) };
}
