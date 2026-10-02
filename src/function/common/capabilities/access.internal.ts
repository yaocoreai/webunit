import type { ServiceKey, ServiceMap } from './contracts';

type CapabilityResolver = <K extends ServiceKey>(
  key: K,
) => ServiceMap[K] | undefined;

const resolvers = new WeakMap<object, CapabilityResolver>();

export function installCapabilityResolver(
  identity: object,
  resolve: CapabilityResolver,
): void {
  if (resolvers.has(identity))
    throw new Error('Capability resolver is already installed');
  resolvers.set(identity, resolve);
}

export function resolveInternalCapability<K extends ServiceKey>(
  identity: object,
  key: K,
): ServiceMap[K] | undefined {
  const resolve = resolvers.get(identity);
  if (!resolve) throw new Error('Capability resolver is not installed');
  return resolve(key);
}
