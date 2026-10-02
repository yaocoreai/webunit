import type { ServiceKey, ServiceMap } from "./contracts";
import { CapabilityUnavailableError } from './error';

export interface CapabilityAccess<
  K extends ServiceKey,
> {
  readonly identity: object;
  get<T extends K>(key: T): ServiceMap[T];
}

export function createCapabilityAccess<
  const R extends readonly ServiceKey[],
>(
  resolve: <K extends ServiceKey>(key: K) => ServiceMap[K] | undefined,
  _required: R,
  identity: object,
): CapabilityAccess<R[number]> {
  const required = new Set<ServiceKey>(_required);
  return Object.freeze({
    identity,
    get<K extends R[number]>(key: K): ServiceMap[K] {
      if (!required.has(key))
        throw new TypeError(`Capability dependency is not declared: ${String(key)}`);
      const value = resolve(key);
      if (value === undefined) throw new CapabilityUnavailableError(String(key));
      return value as ServiceMap[K];
    },
  });
}
