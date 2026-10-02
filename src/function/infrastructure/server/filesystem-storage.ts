import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import type {
  ObjectStorage,
  StorageListResult,
  StorageObject,
  StoragePutOptions,
} from "@/function/common/capabilities/contracts";

export function createFilesystemStorage(rootInput: string): ObjectStorage {
  const root = resolve(rootInput);

  return {
    async get(key): Promise<StorageObject | null> {
      const path = resolveObjectPath(root, key);
      let details;
      try {
        details = await stat(path);
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
      if (!details.isFile()) return null;
      const metadata = await readMetadata(path);
      return {
        key: normalizeKey(key),
        body: Readable.toWeb(
          createReadStream(path),
        ) as ReadableStream<Uint8Array>,
        size: details.size,
        contentType: metadata?.contentType,
        etag: metadata?.etag,
        checksumSha256: metadata?.checksumSha256,
      };
    },
    async put(key, value, options?: StoragePutOptions) {
      const path = resolveObjectPath(root, key);
      const bytes = new Uint8Array(await new Response(value).arrayBuffer());
      const etag = createHash("sha256").update(bytes).digest("hex");
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
      await writeFile(
        metadataPath(path),
        JSON.stringify({
          ...(options?.contentType ? { contentType: options.contentType } : {}),
          checksumSha256: options?.metadata?.checksumSha256 ?? etag,
          etag,
        }),
      );
      return { etag };
    },
    async delete(key) {
      const path = resolveObjectPath(root, key);
      await Promise.all([
        rm(path, { force: true }),
        rm(metadataPath(path), { force: true }),
      ]);
    },
    async list(options = {}): Promise<StorageListResult> {
      const prefix = options.prefix ? normalizePrefix(options.prefix) : "";
      const keys = (await collectFiles(root, root))
        .filter(
          (key) =>
            !key.startsWith(".multipart/") &&
            !key.endsWith(".webunit-meta.json") &&
            key.startsWith(prefix),
        )
        .sort();
      const start = options.cursor
        ? Math.max(
            0,
            keys.findIndex((key) => key > options.cursor!),
          )
        : 0;
      const limit = Math.max(1, Math.min(options.limit ?? 1000, 1000));
      const selected = keys.slice(start, start + limit);
      const objects = await Promise.all(
        selected.map(async (key) => {
          const path = resolveObjectPath(root, key);
          const [details, metadata] = await Promise.all([
            stat(path),
            readMetadata(path),
          ]);
          return {
            key,
            size: details.size,
            ...(metadata?.etag ? { etag: metadata.etag } : {}),
          };
        }),
      );
      const truncated = start + selected.length < keys.length;
      return {
        objects,
        truncated,
        ...(truncated && selected.length ? { cursor: selected.at(-1) } : {}),
      };
    },
    async createMultipart(key, options) {
      const normalizedKey = normalizeKey(key);
      const uploadId = crypto.randomUUID();
      const directory = resolveMultipartPath(root, uploadId);
      await mkdir(directory, { recursive: true });
      await writeFile(
        resolve(directory, "manifest.json"),
        JSON.stringify({
          key: normalizedKey,
          contentType: options?.contentType,
          checksumSha256: options?.metadata?.checksumSha256,
        }),
      );
      return { uploadId };
    },
    async uploadPart(key, uploadId, partNumber, value) {
      const directory = await requireMultipart(root, key, uploadId);
      if (
        !Number.isSafeInteger(partNumber) ||
        partNumber < 1 ||
        partNumber > 10_000
      )
        throw new Error(`Invalid multipart part number: ${partNumber}`);
      const bytes = new Uint8Array(await new Response(value).arrayBuffer());
      const etag = createHash("sha256").update(bytes).digest("hex");
      await writeFile(resolve(directory, `${partNumber}.part`), bytes);
      await writeFile(resolve(directory, `${partNumber}.etag`), etag);
      return { etag };
    },
    async completeMultipart(key, uploadId, parts) {
      const directory = await requireMultipart(root, key, uploadId);
      const manifest = JSON.parse(
        await readFile(resolve(directory, "manifest.json"), "utf8"),
      ) as { contentType?: string; checksumSha256?: string };
      const target = resolveObjectPath(root, key),
        temporary = `${target}.uploading`;
      await mkdir(dirname(target), { recursive: true });
      const output = await open(temporary, "w");
      const hash = createHash("sha256");
      try {
        for (const part of [...parts].sort(
          (left, right) => left.partNumber - right.partNumber,
        )) {
          const partPath = resolve(directory, `${part.partNumber}.part`);
          const [bytes, etag] = await Promise.all([
            readFile(partPath),
            readFile(resolve(directory, `${part.partNumber}.etag`), "utf8"),
          ]);
          if (etag !== part.etag)
            throw new Error(`Multipart part etag mismatch: ${part.partNumber}`);
          hash.update(bytes);
          await output.write(bytes);
        }
      } catch (error) {
        await output.close();
        await rm(temporary, { force: true });
        throw error;
      }
      await output.close();
      const etag = hash.digest("hex");
      await rename(temporary, target);
      await writeFile(
        metadataPath(target),
        JSON.stringify({
          ...(manifest.contentType
            ? { contentType: manifest.contentType }
            : {}),
          checksumSha256: etag,
          etag,
        }),
      );
      await rm(directory, { force: true, recursive: true });
      return { etag };
    },
    async abortMultipart(key, uploadId) {
      const directory = await requireMultipart(root, key, uploadId);
      await rm(directory, { force: true, recursive: true });
    },
  };
}

function normalizeKey(value: string): string {
  const key = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (
    !key ||
    key.length > 1024 ||
    key
      .split("/")
      .some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === ".." ||
          segment.includes("\0"),
      )
  )
    throw new Error(`Invalid storage key: ${value}`);
  return key;
}

function normalizePrefix(value: string): string {
  const trailingSlash = value.replaceAll("\\", "/").endsWith("/");
  const normalized = normalizeKey(value.replace(/\/+$/, ""));
  return trailingSlash ? `${normalized}/` : normalized;
}

function resolveObjectPath(root: string, key: string): string {
  const path = resolve(root, ...normalizeKey(key).split("/"));
  if (path !== root && !path.startsWith(`${root}${sep}`))
    throw new Error(`Storage key escapes root: ${key}`);
  return path;
}

async function collectFiles(
  root: string,
  directory: string,
): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(root, path);
      return entry.isFile() ? [relative(root, path)] : [];
    }),
  );
  return nested.flat().map((key) => key.split(sep).join("/"));
}

type StoredMetadata = Readonly<{
  contentType?: string;
  etag?: string;
  checksumSha256?: string;
}>;
async function readMetadata(path: string): Promise<StoredMetadata | undefined> {
  try {
    return JSON.parse(
      await readFile(metadataPath(path), "utf8"),
    ) as StoredMetadata;
  } catch (error) {
    if (isMissing(error) || error instanceof SyntaxError) return undefined;
    throw error;
  }
}
function metadataPath(path: string): string {
  return `${path}.webunit-meta.json`;
}
function resolveMultipartPath(root: string, uploadId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(uploadId))
    throw new Error(`Invalid multipart upload id: ${uploadId}`);
  return resolve(root, ".multipart", uploadId);
}
async function requireMultipart(root: string, key: string, uploadId: string) {
  const directory = resolveMultipartPath(root, uploadId);
  const manifest = JSON.parse(
    await readFile(resolve(directory, "manifest.json"), "utf8"),
  ) as { key?: string };
  if (manifest.key !== normalizeKey(key))
    throw new Error(`Multipart upload key mismatch: ${uploadId}`);
  return directory;
}
function isMissing(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT",
  );
}
