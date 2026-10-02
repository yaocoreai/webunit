import type { ObjectStorage } from "@/function/common/capabilities/contracts";
import {
  encodeR2UploadTarget,
  signR2UploadTarget,
  type R2UploadTarget,
} from "./r2-upload-signature";

type R2Object = Readonly<{
  key: string;
  body: ReadableStream<Uint8Array> | null;
  size?: number;
  etag?: string;
  httpMetadata?: Readonly<{ contentType?: string }>;
  checksums?: Readonly<{ sha256?: ArrayBuffer | Uint8Array }>;
}>;
export type R2Bucket = Readonly<{
  get(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value: BodyInit | null,
    options?: Readonly<Record<string, unknown>>,
  ): Promise<Readonly<{ etag?: string }>>;
  delete(key: string): Promise<void>;
  list(
    options?: Readonly<{ prefix?: string; cursor?: string; limit?: number }>,
  ): Promise<
    Readonly<{
      objects: readonly Readonly<{
        key: string;
        size?: number;
        etag?: string;
      }>[];
      cursor?: string;
      truncated: boolean;
    }>
  >;
  createMultipartUpload?(
    key: string,
    options?: Readonly<Record<string, unknown>>,
  ): Promise<R2MultipartUpload>;
  resumeMultipartUpload?(key: string, uploadId: string): R2MultipartUpload;
}>;
type R2MultipartUpload = Readonly<{
  uploadId: string;
  uploadPart(
    partNumber: number,
    value: BodyInit,
  ): Promise<Readonly<{ partNumber: number; etag: string }>>;
  complete(
    parts: readonly Readonly<{ partNumber: number; etag: string }>[],
  ): Promise<Readonly<{ etag?: string }>>;
  abort(): Promise<void>;
}>;

export function isR2Bucket(value: unknown): value is R2Bucket {
  return hasMethods(value, ["get", "put", "delete", "list"]);
}

export function createR2Storage(
  value: unknown,
  upload?: Readonly<{ origin?: unknown; secret?: unknown }>,
): ObjectStorage | undefined {
  if (!isR2Bucket(value)) return undefined;
  const bucket = value;
  const multipart =
    bucket.createMultipartUpload && bucket.resumeMultipartUpload
      ? {
          createMultipart: async (
            key: string,
            options?: Parameters<ObjectStorage["put"]>[2],
          ) => ({
            uploadId: (
              await bucket.createMultipartUpload!(key, metadata(options))
            ).uploadId,
          }),
          uploadPart: (
            key: string,
            uploadId: string,
            partNumber: number,
            body: BodyInit,
          ) =>
            bucket.resumeMultipartUpload!(key, uploadId).uploadPart(
              partNumber,
              body,
            ),
          completeMultipart: (
            key: string,
            uploadId: string,
            parts: readonly Readonly<{ partNumber: number; etag: string }>[],
          ) => bucket.resumeMultipartUpload!(key, uploadId).complete(parts),
          abortMultipart: (key: string, uploadId: string) =>
            bucket.resumeMultipartUpload!(key, uploadId).abort(),
        }
      : {};
  const direct = directUpload(upload);
  return {
    async get(key) {
      const object = await bucket.get(key);
      return (
        object && {
          key: object.key,
          body: object.body,
          size: object.size,
          etag: object.etag,
          contentType: object.httpMetadata?.contentType,
          checksumSha256: sha256(object),
        }
      );
    },
    put: (key, body, options) => bucket.put(key, body, metadata(options)),
    delete: (key) => bucket.delete(key),
    list: (options) => bucket.list(options),
    ...multipart,
    ...direct,
  };
}

export async function uploadR2Target(
  bucket: R2Bucket,
  target: R2UploadTarget,
  body: BodyInit,
): Promise<Readonly<{ etag?: string }>> {
  if (target.uploadId) {
    if (!bucket.resumeMultipartUpload || !target.partNumber)
      throw new TypeError("R2 multipart upload is unavailable");
    return bucket
      .resumeMultipartUpload(target.key, target.uploadId)
      .uploadPart(target.partNumber, body);
  }
  return bucket.put(target.key, body, targetMetadata(target));
}

function directUpload(
  input: Readonly<{ origin?: unknown; secret?: unknown }> | undefined,
): Partial<Pick<ObjectStorage, "signPut" | "signUploadPart">> {
  if (
    typeof input?.origin !== "string" ||
    !input.origin.trim() ||
    typeof input.secret !== "string" ||
    input.secret.length < 32
  )
    return {};
  const origin = new URL(input.origin);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.origin !== input.origin
  )
    throw new Error("STORAGE_ORIGIN must be an absolute HTTP or HTTPS origin");
  const target = async (value: R2UploadTarget) => {
    const url = new URL("/upload", origin);
    url.searchParams.set("target", encodeR2UploadTarget(value));
    url.searchParams.set(
      "signature",
      await signR2UploadTarget(value, input.secret as string),
    );
    return {
      method: "PUT" as const,
      url: url.toString(),
      ...(value.contentType
        ? { headers: { "content-type": value.contentType } }
        : {}),
    };
  };
  return {
    signPut: (key, expires, options) =>
      target({
        key,
        expiresAt: Math.floor(Date.now() / 1000) + expires,
        ...(options?.contentType ? { contentType: options.contentType } : {}),
        ...(options?.metadata ? { metadata: options.metadata } : {}),
      }),
    signUploadPart: (key, uploadId, partNumber, expires) =>
      target({
        key,
        uploadId,
        partNumber,
        expiresAt: Math.floor(Date.now() / 1000) + expires,
      }),
  };
}
function metadata(options?: Parameters<ObjectStorage["put"]>[2]) {
  return {
    ...(options?.contentType
      ? { httpMetadata: { contentType: options.contentType } }
      : {}),
    ...(options?.metadata ? { customMetadata: options.metadata } : {}),
  };
}
function targetMetadata(target: R2UploadTarget) {
  return {
    ...(target.contentType
      ? { httpMetadata: { contentType: target.contentType } }
      : {}),
    ...(target.metadata ? { customMetadata: target.metadata } : {}),
  };
}
function sha256(object: R2Object) {
  const checksum = object.checksums?.sha256;
  return checksum
    ? [
        ...(checksum instanceof Uint8Array
          ? checksum
          : new Uint8Array(checksum)),
      ]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
    : undefined;
}
function hasMethods(value: unknown, methods: readonly string[]) {
  return Boolean(
    value &&
    typeof value === "object" &&
    methods.every(
      (method) =>
        typeof (value as Record<string, unknown>)[method] === "function",
    ),
  );
}
