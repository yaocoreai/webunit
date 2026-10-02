import type { CacheStore, ObjectStorage } from "../capabilities/contracts";
import { readObjectStorageCapabilities, type Storage } from "./model";
import { createStorageUploadTicketService } from "./upload-ticket";

export type StorageDependencies = Readonly<{
  getCache(): CacheStore;
  getObjectStorage(): ObjectStorage;
}>;

export function createStorageService(
  dependencies: StorageDependencies,
): Storage {
  const objectStorage = (): ObjectStorage => dependencies.getObjectStorage();
  const uploadTickets = createStorageUploadTicketService({
    get: (...args) => dependencies.getCache().get(...args),
    put: (...args) => dependencies.getCache().put(...args),
    delete: (...args) => dependencies.getCache().delete(...args),
  });
  const service: Storage = {
    uploadTickets,
    capabilities: () => readObjectStorageCapabilities(objectStorage()),
    get: (...args) => objectStorage().get(...args),
    put: (...args) => objectStorage().put(...args),
    delete: (...args) => objectStorage().delete(...args),
    list: (...args) => objectStorage().list(...args),
    createMultipart: async (...args) => {
      const storage = objectStorage();
      if (!storage.createMultipart)
        throw new Error("Storage multipart upload is not configured");
      return storage.createMultipart(...args);
    },
    uploadPart: async (...args) => {
      const storage = objectStorage();
      if (!storage.uploadPart)
        throw new Error("Storage multipart upload is not configured");
      return storage.uploadPart(...args);
    },
    completeMultipart: async (...args) => {
      const storage = objectStorage();
      if (!storage.completeMultipart)
        throw new Error("Storage multipart upload is not configured");
      return storage.completeMultipart(...args);
    },
    abortMultipart: async (...args) => {
      const storage = objectStorage();
      if (!storage.abortMultipart)
        throw new Error("Storage multipart upload is not configured");
      return storage.abortMultipart(...args);
    },
    signPut: async (...args) => {
      const storage = objectStorage();
      if (!storage.signPut)
        throw new Error("Storage direct upload is not configured");
      return storage.signPut(...args);
    },
    signUploadPart: async (...args) => {
      const storage = objectStorage();
      if (!storage.signUploadPart)
        throw new Error("Storage direct multipart upload is not configured");
      return storage.signUploadPart(...args);
    },
    signGet: async (...args) => {
      const storage = objectStorage();
      if (!storage.signGet)
        throw new Error("Storage direct read is not configured");
      return storage.signGet(...args);
    },
  };
  return Object.freeze(service);
}
