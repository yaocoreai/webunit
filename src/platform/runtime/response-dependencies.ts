import type { ContentCacheDependency, ResponseCachePolicy } from '@/platform/cache/contracts';

export class ResponseDependencyCollector {
  readonly #policies: ResponseCachePolicy[] = [];
  #sealed?: ResponseCachePolicy;

  add(policy: ResponseCachePolicy) {
    if (this.#sealed) {
      const candidate = mergePolicies([...this.#policies, policy]);
      if (samePolicy(candidate, this.#sealed)) return;
      throw new Error(`A late response dependency would change sealed cache policy: ${policy.surrogateKeys.join(',')}`);
    }
    this.#policies.push(policy);
  }

  addApi(dependency: ContentCacheDependency) {
    if (dependency.noStore) {
      this.add({ mode: 'no-store', visibility: 'public', surrogateKeys: [...dependency.surrogateKeys] });
      return;
    }
    this.add({
      mode: 'public',
      browserTtlSeconds: dependency.browserTtlSeconds,
      sharedTtlSeconds: dependency.sharedTtlSeconds,
      staleWhileRevalidateSeconds: dependency.staleWhileRevalidateSeconds,
      surrogateKeys: [...dependency.surrogateKeys],
    });
  }

  snapshot() {
    return {
      count: this.#policies.length,
      surrogateKeys: [...new Set(this.#policies.flatMap((policy) => policy.surrogateKeys))],
      sealed: Boolean(this.#sealed),
    } as const;
  }

  seal(): ResponseCachePolicy {
    if (this.#sealed) return this.#sealed;
    if (!this.#policies.length) throw new Error('Response dependencies cannot be empty');
    this.#sealed = mergePolicies(this.#policies);
    return this.#sealed;
  }
}

function mergePolicies(policies: ResponseCachePolicy[]): ResponseCachePolicy {
  const surrogateKeys = [...new Set(policies.flatMap((policy) => policy.surrogateKeys))].sort();
  const noStore = policies.filter((policy) => policy.mode === 'no-store');
  if (noStore.length) return {
    mode: 'no-store',
    visibility: noStore.some((policy) => policy.visibility === 'preview') ? 'preview' : 'public',
    surrogateKeys,
  };
  const publicPolicies = policies.filter((policy): policy is Extract<ResponseCachePolicy, { mode: 'public' }> => policy.mode === 'public');
  return {
    mode: 'public',
    browserTtlSeconds: Math.min(...publicPolicies.map((policy) => policy.browserTtlSeconds)),
    sharedTtlSeconds: Math.min(...publicPolicies.map((policy) => policy.sharedTtlSeconds)),
    staleWhileRevalidateSeconds: Math.min(...publicPolicies.map((policy) => policy.staleWhileRevalidateSeconds)),
    surrogateKeys,
  };
}

function samePolicy(left: ResponseCachePolicy, right: ResponseCachePolicy) {
  if (left.mode !== right.mode || left.surrogateKeys.length !== right.surrogateKeys.length) return false;
  if (left.surrogateKeys.some((key, index) => key !== right.surrogateKeys[index])) return false;
  if (left.mode === 'no-store' || right.mode === 'no-store') {
    return left.mode === 'no-store' && right.mode === 'no-store' && left.visibility === right.visibility;
  }
  return left.browserTtlSeconds === right.browserTtlSeconds
    && left.sharedTtlSeconds === right.sharedTtlSeconds
    && left.staleWhileRevalidateSeconds === right.staleWhileRevalidateSeconds;
}
