import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import type {
  ObjectStorage,
  StorageObject,
  StoragePutOptions,
} from "@/function/common/capabilities/contracts";

export type S3StorageConfig = Readonly<{
  endpoint: string;
  publicEndpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}>;

export function createS3Storage(config: S3StorageConfig): ObjectStorage {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const signingClient = new S3Client({
    endpoint: config.publicEndpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const target = (key: string) => ({ Bucket: config.bucket, Key: key });
  return {
    async get(key): Promise<StorageObject | null> {
      try {
        const result = await client.send(new GetObjectCommand(target(key)));
        return {
          key,
          body: toWebStream(result.Body),
          size: result.ContentLength,
          contentType: result.ContentType,
          etag: normalizeEtag(result.ETag),
          checksumSha256: result.Metadata?.checksumsha256,
        };
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
    async put(key, value, options?: StoragePutOptions) {
      const result = await client.send(
        new PutObjectCommand({
          ...target(key),
          Body: await bodyBytes(value),
          ContentType: options?.contentType,
          Metadata: options?.metadata,
        }),
      );
      return { etag: normalizeEtag(result.ETag) };
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand(target(key)));
    },
    async list(options = {}) {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: options.prefix,
          ContinuationToken: options.cursor,
          MaxKeys: Math.max(1, Math.min(options.limit ?? 1000, 1000)),
        }),
      );
      return {
        objects: (result.Contents ?? []).flatMap((object) =>
          object.Key
            ? [
                {
                  key: object.Key,
                  size: object.Size,
                  etag: normalizeEtag(object.ETag),
                },
              ]
            : [],
        ),
        truncated: result.IsTruncated === true,
        ...(result.NextContinuationToken
          ? { cursor: result.NextContinuationToken }
          : {}),
      };
    },
    async createMultipart(key, options) {
      const result = await client.send(
        new CreateMultipartUploadCommand({
          ...target(key),
          ContentType: options?.contentType,
          Metadata: options?.metadata,
        }),
      );
      if (!result.UploadId)
        throw new Error("S3 did not return a multipart upload id");
      return { uploadId: result.UploadId };
    },
    async uploadPart(key, uploadId, partNumber, value) {
      const result = await client.send(
        new UploadPartCommand({
          ...target(key),
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: await bodyBytes(value),
        }),
      );
      const etag = normalizeEtag(result.ETag);
      if (!etag) throw new Error("S3 did not return a multipart part ETag");
      return { etag };
    },
    async completeMultipart(key, uploadId, parts) {
      const result = await client.send(
        new CompleteMultipartUploadCommand({
          ...target(key),
          UploadId: uploadId,
          MultipartUpload: {
            Parts: parts.map((part) => ({
              ETag: part.etag,
              PartNumber: part.partNumber,
            })),
          },
        }),
      );
      return { etag: normalizeEtag(result.ETag) };
    },
    async abortMultipart(key, uploadId) {
      await client.send(
        new AbortMultipartUploadCommand({ ...target(key), UploadId: uploadId }),
      );
    },
    async signPut(key, expiresInSeconds, options) {
      const headers = options?.metadata
        ? Object.fromEntries(Object.entries(options.metadata).map(([name, value]) => [`x-amz-meta-${name.toLowerCase()}`, value]))
        : undefined;
      const url = await getSignedUrl(signingClient, new PutObjectCommand({ ...target(key), ContentType: options?.contentType, Metadata: options?.metadata }), { expiresIn: signedExpiry(expiresInSeconds) });
      return { method: "PUT", url, ...(headers ? { headers } : {}) };
    },
    async signUploadPart(key, uploadId, partNumber, expiresInSeconds) {
      const url = await getSignedUrl(signingClient, new UploadPartCommand({ ...target(key), UploadId: uploadId, PartNumber: partNumber }), { expiresIn: signedExpiry(expiresInSeconds) });
      return { method: "PUT", url };
    },
    async signGet(key, expiresInSeconds, options) {
      const url = await getSignedUrl(signingClient, new GetObjectCommand({ ...target(key), ResponseContentType: options?.contentType, ResponseContentDisposition: options?.disposition }), { expiresIn: signedExpiry(expiresInSeconds) });
      return { method: "GET", url };
    },
  };
}

function signedExpiry(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("Invalid S3 signed URL expiry");
  return Math.min(value, 604_800);
}

async function bodyBytes(value: BodyInit | null): Promise<Uint8Array> {
  return new Uint8Array(await new Response(value).arrayBuffer());
}
function toWebStream(body: unknown): ReadableStream<Uint8Array> | null {
  if (!body) return null;
  if (
    typeof (body as { transformToWebStream?: unknown }).transformToWebStream ===
    "function"
  )
    return (
      body as { transformToWebStream(): ReadableStream<Uint8Array> }
    ).transformToWebStream();
  if (body instanceof Readable)
    return Readable.toWeb(body) as ReadableStream<Uint8Array>;
  if (body instanceof ReadableStream) return body as ReadableStream<Uint8Array>;
  throw new Error("Unsupported S3 response body");
}
function normalizeEtag(value: string | undefined): string | undefined {
  return value?.replace(/^"|"$/g, "");
}
function isMissing(error: unknown): boolean {
  const value = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    value?.name === "NoSuchKey" || value?.$metadata?.httpStatusCode === 404
  );
}
