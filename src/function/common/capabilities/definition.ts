import type { AppCapabilities, ServiceKey, ServiceMap } from "./contracts";
import type { CapabilityAccess } from "./access";

export type CapabilityFactory<
  K extends ServiceKey,
  R extends readonly ServiceKey[],
> = (dependencies: CapabilityAccess<R[number]>) => ServiceMap[K];

export type CapabilityDefinition<
  K extends ServiceKey = ServiceKey,
  R extends readonly ServiceKey[] = readonly ServiceKey[],
> = Readonly<{
  key: K;
  required: R;
  create: CapabilityFactory<K, R>;
}>;

export function defineCapability<
  K extends ServiceKey,
  const R extends readonly ServiceKey[],
>(definition: CapabilityDefinition<K, R>): CapabilityDefinition<K, R> {
  if (new Set(definition.required).size !== definition.required.length)
    throw new TypeError(`Duplicate capability dependency: ${definition.key}`);
  if (typeof definition.create !== 'function')
    throw new TypeError(`Capability factory is required: ${definition.key}`);
  return Object.freeze({
    ...definition,
    required: Object.freeze([...definition.required]) as unknown as R,
  });
}

export function defineCapabilities<
  const T extends readonly CapabilityDefinition[],
>(definitions: T): T {
  const keys = new Set<ServiceKey>();
  for (const definition of definitions) {
    if (keys.has(definition.key))
      throw new Error(`Duplicate capability definition: ${definition.key}`);
    keys.add(definition.key);
  }
  return Object.freeze([...definitions]) as unknown as T;
}

export type InfrastructureServices = AppCapabilities;
