import type { CapabilityAccess } from "../capabilities/access";
import type { Storage } from "./model";
import { memoizeAsync } from '../lazy/promise';

export function createStorage(
  dependencies: CapabilityAccess<"cache" | "objectStorage">,
): Storage {
  const resolve = memoizeAsync(async () => {
    const { createStorageService } = await import('./service');
    return createStorageService({
        getCache: () => dependencies.get("cache"),
        getObjectStorage: () => dependencies.get("objectStorage"),
      });
  });
  const service: Storage = {
    uploadTickets: Object.freeze({
      create: async (...args) =>
        (await resolve()).uploadTickets.create(...args),
      verify: async (...args) =>
        (await resolve()).uploadTickets.verify(...args),
    }),
    capabilities: async () => (await resolve()).capabilities(),
    get: async (...args) => (await resolve()).get(...args),
    put: async (...args) => (await resolve()).put(...args),
    delete: async (...args) => (await resolve()).delete(...args),
    list: async (...args) => (await resolve()).list(...args),
    createMultipart: async (...args) =>
      (await resolve()).createMultipart!(...args),
    uploadPart: async (...args) => (await resolve()).uploadPart!(...args),
    completeMultipart: async (...args) =>
      (await resolve()).completeMultipart!(...args),
    abortMultipart: async (...args) =>
      (await resolve()).abortMultipart!(...args),
    signPut: async (...args) => (await resolve()).signPut(...args),
    signUploadPart: async (...args) =>
      (await resolve()).signUploadPart(...args),
    signGet: async (...args) => (await resolve()).signGet(...args),
  };
  return Object.freeze(service);
}
