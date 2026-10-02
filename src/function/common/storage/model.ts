import type {
  ObjectStorage,
  ObjectStorageCapabilities,
  StoragePutOptions,
  StorageSignedRequest,
} from "../capabilities/contracts";
import type { StorageUploadTicketService } from "./upload-ticket";

/** 跨业务 Storage 能力；终端对象存储只作为其内部基础依赖。 */
export interface Storage extends ObjectStorage {
  readonly uploadTickets: StorageUploadTicketService;
  capabilities(): Promise<ObjectStorageCapabilities>;
  signPut(
    key: string,
    expiresInSeconds: number,
    options?: StoragePutOptions,
  ): Promise<StorageSignedRequest>;
  signUploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresInSeconds: number,
  ): Promise<StorageSignedRequest>;
  signGet(
    key: string,
    expiresInSeconds: number,
    options?: Readonly<{ contentType?: string; disposition?: string }>,
  ): Promise<StorageSignedRequest>;
}

export async function readObjectStorageCapabilities(
  storage: ObjectStorage,
): Promise<ObjectStorageCapabilities> {
  const declared = await storage.capabilities?.();
  return (
    declared ?? {
      signedPut: Boolean(storage.signPut),
      signedUploadPart: Boolean(storage.signUploadPart),
      signedGet: Boolean(storage.signGet),
    }
  );
}
