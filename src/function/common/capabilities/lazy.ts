import type {
  CacheStore,
  Config,
  Enums,
  RateLimiter,
  ObjectStorage,
  Geo,
} from "./contracts";
import { memoizeRequired } from '../lazy/promise';
import type { GeoDescriptor } from "../geo";

export function createLazyGeo(
  load: () => Promise<Geo | undefined>,
  descriptor: GeoDescriptor,
): Geo {
  const resolve = memoizeRequired(load, "Geo is not configured");
  return {
    describe: () => descriptor,
    lookupIp: async (...args) => (await resolve()).lookupIp(...args),
  };
}

export function createLazyConfig(load: () => Promise<Config | undefined>): Config {
  const resolve = memoizeRequired(load, "Config is not configured");
  return {
    list: async (...args) => (await resolve()).list(...args),
    get: async (...args) => (await resolve()).get(...args),
    getPublic: async (...args) => (await resolve()).getPublic(...args),
    prepareSet: async (...args) => (await resolve()).prepareSet(...args),
    set: async (...args) => (await resolve()).set(...args),
    prepareDelete: async (...args) => (await resolve()).prepareDelete(...args),
    delete: async (...args) => (await resolve()).delete(...args),
  };
}

export function createLazyEnums(load: () => Promise<Enums | undefined>): Enums {
  const resolve = memoizeRequired(load, "Enums is not configured");
  return {
    listCatalogs: async (...args) => (await resolve()).listCatalogs(...args),
    list: async (...args) => (await resolve()).list(...args),
    listPublic: async (...args) => (await resolve()).listPublic(...args),
    setCatalog: async (...args) => (await resolve()).setCatalog(...args),
  };
}

export function createLazyCache(load: () => Promise<CacheStore | undefined>): CacheStore {
  const resolve = memoizeRequired(load, "Cache is not configured");
  return {
    get: async (...args) => (await resolve()).get(...args),
    put: async (...args) => (await resolve()).put(...args),
    delete: async (...args) => (await resolve()).delete(...args),
  };
}

export function createLazyRateLimiter(
  load: () => Promise<RateLimiter | undefined>,
): RateLimiter {
  const resolve = memoizeRequired(load, "Rate limiter is not configured");
  return { consume: async (...args) => (await resolve()).consume(...args) };
}

export function createLazyObjectStorage(
  load: () => Promise<ObjectStorage | undefined>,
  options: Readonly<{
    signedPut?: boolean;
    signedUploadPart?: boolean;
    signedGet?: boolean;
  }> = {},
): ObjectStorage {
  const resolve = memoizeRequired(load, "Storage is not configured");
  return {
    capabilities: () => ({
      signedPut: options.signedPut === true,
      signedUploadPart: options.signedUploadPart === true,
      signedGet: options.signedGet === true,
    }),
    get: async (...args) => (await resolve()).get(...args),
    put: async (...args) => (await resolve()).put(...args),
    delete: async (...args) => (await resolve()).delete(...args),
    list: async (...args) => (await resolve()).list(...args),
    createMultipart: async (...args) => {
      const capability = await resolve();
      if (!capability.createMultipart)
        throw new Error("Storage multipart upload is not configured");
      return capability.createMultipart(...args);
    },
    uploadPart: async (...args) => {
      const capability = await resolve();
      if (!capability.uploadPart)
        throw new Error("Storage multipart upload is not configured");
      return capability.uploadPart(...args);
    },
    completeMultipart: async (...args) => {
      const capability = await resolve();
      if (!capability.completeMultipart)
        throw new Error("Storage multipart upload is not configured");
      return capability.completeMultipart(...args);
    },
    abortMultipart: async (...args) => {
      const capability = await resolve();
      if (!capability.abortMultipart)
        throw new Error("Storage multipart upload is not configured");
      return capability.abortMultipart(...args);
    },
    ...(options.signedPut
      ? {
          signPut: async (...args: Parameters<NonNullable<ObjectStorage["signPut"]>>) => {
            const capability = await resolve();
            if (!capability.signPut) throw new Error("Storage direct upload is not configured");
            return capability.signPut(...args);
          },
        }
      : {}),
    ...(options.signedUploadPart
      ? {
          signUploadPart: async (...args: Parameters<NonNullable<ObjectStorage["signUploadPart"]>>) => {
            const capability = await resolve();
            if (!capability.signUploadPart) throw new Error("Storage direct multipart upload is not configured");
            return capability.signUploadPart(...args);
          },
        }
      : {}),
    ...(options.signedGet
      ? {
          signGet: async (...args: Parameters<NonNullable<ObjectStorage["signGet"]>>) => {
            const capability = await resolve();
            if (!capability.signGet) throw new Error("Storage direct read is not configured");
            return capability.signGet(...args);
          },
        }
      : {}),
  };
}
