import type { ApplicationServices } from "@/function/common/app/services";
import {
  applicationServiceKeys,
  applicationCapabilityAccessors,
  compositeCapabilityKeys,
  type ApplicationServiceMap,
  type AppCapabilities,
  type InternalCapabilities,
  type RuntimePrimitives,
  type ServiceMap,
  type ServiceKey,
} from "./contracts";
import { createCapabilityAccess } from "./access";
import { installCapabilityResolver } from './access.internal';
import type { CapabilityDefinition } from "./definition";

export function resolveCapabilities(
  base: AppCapabilities,
  definitions: readonly CapabilityDefinition[],
): ApplicationServices {
  return resolveApplicationComposition(base, definitions).services;
}

export type ApplicationComposition = Readonly<{
  runtime: RuntimePrimitives;
  internal: InternalCapabilities;
  services: ApplicationServices;
}>;

export function resolveApplicationComposition(
  base: RuntimePrimitives,
  definitions: readonly CapabilityDefinition[],
): ApplicationComposition {
  const compositionIdentity = Object.freeze({});
  const definitionsByKey = new Map(definitions.map((definition) => [definition.key, definition]));
  const availability = new Map<ServiceKey, boolean>();
  const checkingAvailability = new Set<ServiceKey>();
  const isAvailable = (key: ServiceKey): boolean => {
    const cached = availability.get(key);
    if (cached !== undefined) return cached;
    if (checkingAvailability.has(key))
      throw new Error(`Circular capability dependency: ${key}`);
    checkingAvailability.add(key);
    try {
      const definition = definitionsByKey.get(key);
      const available = definition
        ? definition.required.every(isAvailable)
        : primitiveIsConfigured(base, key);
      availability.set(key, available);
      return available;
    } finally {
      checkingAvailability.delete(key);
    }
  };
  const services = Object.defineProperties(
    {},
    Object.getOwnPropertyDescriptors(base),
  ) as Partial<ServiceMap>;
  const resolving = new Set<ServiceKey>();
  const resolve = <K extends ServiceKey>(key: K): ServiceMap[K] | undefined => {
    const descriptor = Object.getOwnPropertyDescriptor(services, key);
    if (!descriptor) return undefined;
    return services[key] as ServiceMap[K] | undefined;
  };
  installCapabilityResolver(compositionIdentity, resolve);

  for (const definition of definitions) {
    if (Object.prototype.hasOwnProperty.call(services, definition.key))
      throw new Error(`Capability is already registered: ${definition.key}`);
    const access = createCapabilityAccess(resolve, definition.required, compositionIdentity);
    let initialized = false;
    let value: ServiceMap[typeof definition.key] | undefined;
    Object.defineProperty(services, definition.key, {
      configurable: false,
      enumerable: true,
      get() {
        if (initialized) return value;
        if (!isAvailable(definition.key)) {
          initialized = true;
          return undefined;
        }
        if (resolving.has(definition.key))
          throw new Error(`Circular capability dependency: ${definition.key}`);
        resolving.add(definition.key);
        try {
          value = definition.create(access);
          initialized = true;
          return value;
        } finally {
          resolving.delete(definition.key);
        }
      },
    });
  }

  const internal = Object.freeze(services) as InternalCapabilities;
  return Object.freeze({
    runtime: base,
    internal,
    services: projectApplicationServices(internal, isAvailable),
  });
}

function primitiveIsConfigured(base: RuntimePrimitives, key: ServiceKey) {
  const descriptor = Object.getOwnPropertyDescriptor(base, key);
  if (!descriptor) return false;
  return typeof descriptor.get === "function" || descriptor.value !== undefined;
}

export function projectApplicationServices(
  capabilities: Readonly<Partial<ServiceMap>>,
  isAvailable: (key: ServiceKey) => boolean,
): ApplicationServices {
  const descriptors: PropertyDescriptorMap = {};
  for (const key of applicationServiceKeys) {
    if ((compositeCapabilityKeys as readonly string[]).includes(key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(capabilities, key);
    if (descriptor) descriptors[key] = descriptor;
  }
  const get = <K extends keyof ApplicationServiceMap>(key: K) =>
    capabilities[key];
  descriptors.has = method((key: ServiceKey) => isAvailable(key));
  for (const [key, accessor] of Object.entries(applicationCapabilityAccessors))
    descriptors[accessor] = method(() =>
      get(key as keyof typeof applicationCapabilityAccessors),
    );
  return Object.freeze(
    Object.defineProperties({}, descriptors),
  ) as ApplicationServices;
}

function method(value: (...args: never[]) => unknown): PropertyDescriptor {
  return { configurable: false, enumerable: false, value, writable: false };
}

export function createApplicationServicesResolver(
  definitions: readonly CapabilityDefinition[],
): (base: AppCapabilities) => ApplicationServices {
  const applications = new WeakMap<AppCapabilities, ApplicationServices>();
  return (base) => {
    const existing = applications.get(base);
    if (existing) return existing;
    const services = resolveCapabilities(base, definitions);
    applications.set(base, services);
    applications.set(services, services);
    return services;
  };
}

export function createApplicationCompositionResolver(
  definitions: readonly CapabilityDefinition[],
): (base: RuntimePrimitives) => ApplicationComposition {
  const applications = new WeakMap<object, ApplicationComposition>();
  return (base) => {
    const existing = applications.get(base as object);
    if (existing) return existing;
    const composition = resolveApplicationComposition(base, definitions);
    applications.set(base as object, composition);
    return composition;
  };
}
