import type { JsonValue as SchemaJsonValue } from "@/function/common/app/schema";

export type DatabaseResult<T = unknown> = Readonly<{
  success: boolean;
  results?: readonly T[];
  rowsRead?: number;
  rowsWritten?: number;
}>;

export interface DatabaseStatement {
  bind(...values: unknown[]): DatabaseStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<Readonly<{ results: T[] }>>;
  run(): Promise<DatabaseResult>;
}

export interface Database {
  prepare(query: string): DatabaseStatement;
  batch(
    statements: readonly DatabaseStatement[],
  ): Promise<readonly DatabaseResult[]>;
  diagnostics?(): Readonly<{
    connected: boolean;
    operations: number;
    failures: number;
    slowQueries: number;
    totalDurationMs: number;
    maxDurationMs: number;
    lastSuccessAt?: string;
    lastFailureAt?: string;
    recentSlowQueries: readonly Readonly<{
      query: string;
      durationMs: number;
      occurredAt: string;
    }>[];
  }>;
}

export type StorageObject = Readonly<{
  key: string;
  body: ReadableStream<Uint8Array> | null;
  size?: number;
  contentType?: string;
  etag?: string;
  checksumSha256?: string;
}>;

export type StoragePutOptions = Readonly<{
  contentType?: string;
  metadata?: Readonly<Record<string, string>>;
}>;
export type StorageListResult = Readonly<{
  objects: readonly Readonly<{ key: string; size?: number; etag?: string }>[];
  cursor?: string;
  truncated: boolean;
}>;
export type StorageSignedRequest = Readonly<{
  method: "GET" | "PUT";
  url: string;
  headers?: Readonly<Record<string, string>>;
}>;
export type ObjectStorageCapabilities = Readonly<{
  signedPut: boolean;
  signedUploadPart: boolean;
  signedGet: boolean;
}>;

export interface ObjectStorage {
  capabilities?(): ObjectStorageCapabilities | Promise<ObjectStorageCapabilities>;
  get(key: string): Promise<StorageObject | null>;
  put(
    key: string,
    value: BodyInit | null,
    options?: StoragePutOptions,
  ): Promise<Readonly<{ etag?: string }>>;
  delete(key: string): Promise<void>;
  list(
    options?: Readonly<{ prefix?: string; cursor?: string; limit?: number }>,
  ): Promise<StorageListResult>;
  createMultipart?(
    key: string,
    options?: StoragePutOptions,
  ): Promise<Readonly<{ uploadId: string }>>;
  uploadPart?(
    key: string,
    uploadId: string,
    partNumber: number,
    value: BodyInit,
  ): Promise<Readonly<{ etag: string }>>;
  completeMultipart?(
    key: string,
    uploadId: string,
    parts: readonly Readonly<{ partNumber: number; etag: string }>[],
  ): Promise<Readonly<{ etag?: string }>>;
  abortMultipart?(key: string, uploadId: string): Promise<void>;
  signPut?(
    key: string,
    expiresInSeconds: number,
    options?: StoragePutOptions,
  ): Promise<StorageSignedRequest>;
  signUploadPart?(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresInSeconds: number,
  ): Promise<StorageSignedRequest>;
  signGet?(
    key: string,
    expiresInSeconds: number,
    options?: Readonly<{ contentType?: string; disposition?: string }>,
  ): Promise<StorageSignedRequest>;
}

export type { Storage } from "../storage/model";
import type { Storage } from "../storage/model";
import type { CacheStore } from "../cache";
export type { CacheStore } from "../cache";

export type RateLimitResult = Readonly<{
  enabled: boolean;
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}>;

export interface RateLimiter {
  consume(
    input: Readonly<{
      bucket: string;
      key: string;
      limit: number;
      windowMs: number;
    }>,
  ): Promise<RateLimitResult>;
}

export type ConfigRecord = Readonly<{
  namespace: string;
  key: string;
  value: SchemaJsonValue;
  visibility: "private" | "public";
  version: number;
  updatedAt: string;
}>;

export type ConfigMutationPlan<T> = Readonly<{
  statements: readonly DatabaseStatement[];
  complete(results: readonly DatabaseResult[]): Promise<T>;
}>;

export interface Config {
  list(input: Readonly<{
    namespace?: string;
    key?: string;
    visibility?: "private" | "public";
    page: number;
    pageSize: number;
  }>): Promise<Readonly<{
    items: readonly ConfigRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>>;
  get(namespace: string, key: string): Promise<ConfigRecord | undefined>;
  getPublic(namespace: string, key: string): Promise<ConfigRecord | undefined>;
  prepareSet(
    namespace: string,
    key: string,
    input: Readonly<{
      value: unknown;
      visibility?: "private" | "public";
    }>,
    actor?: string,
  ): Promise<ConfigMutationPlan<ConfigRecord>>;
  set(
    namespace: string,
    key: string,
    input: Readonly<{
      value: unknown;
      visibility?: "private" | "public";
    }>,
    actor?: string,
  ): Promise<ConfigRecord>;
  prepareDelete(
    namespace: string,
    key: string,
    actor?: string,
  ): Promise<ConfigMutationPlan<boolean>>;
  delete(namespace: string, key: string, actor?: string): Promise<boolean>;
}

export type DataProtectionPurpose = string | Readonly<{
  domain: string;
  purpose: string;
}>;

export interface DataProtection {
  protect(value: string, purpose: string): Promise<string>;
  reveal(value: string, purpose: string): Promise<string>;
  digest(value: string, purpose: DataProtectionPurpose): Promise<string>;
}

export type EnumItem = Readonly<{
  key: string;
  code: string;
  label: string;
  hasChildren?: boolean;
  parent?: Readonly<{ key: string; code: string }>;
}>;

export type EnumCatalog = Readonly<{
  key: string;
  version: string;
  visibility: "private" | "public";
  revision: number;
  updatedAt: string | null;
  items: readonly EnumItem[];
}>;

export type EnumCatalogRecord = Omit<EnumCatalog, "items">;

export interface Enums {
  listCatalogs(
    page: number,
    pageSize: number,
    filters?: Readonly<{
      key?: string;
      version?: string;
      visibility?: "private" | "public";
    }>,
  ): Promise<Readonly<{
    items: readonly EnumCatalogRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>>;
  list(
    key: string,
    parent?: Readonly<{ key: string; code: string }>,
    rootsOnly?: boolean,
  ): Promise<EnumCatalog | undefined>;
  listPublic(
    key: string,
    parent?: Readonly<{ key: string; code: string }>,
    rootsOnly?: boolean,
  ): Promise<EnumCatalog | undefined>;
  setCatalog(input: Readonly<{
    key: string;
    version?: string;
    visibility?: "private" | "public";
    expectedRevision?: number;
    actor?: string;
  }>): Promise<EnumCatalogRecord>;
}

import type { Geo } from "../geo";
export type { Geo } from "../geo";

export interface RuntimePrimitiveMap {
  database: Database;
  objectStorage: ObjectStorage;
  cache: CacheStore;
  rateLimiter: RateLimiter;
  geo: Geo;
  dataProtection: DataProtection;
}

export interface CompositeCapabilityMap {
  storage: Storage;
  config: Config;
  enums: Enums;
}

export interface InternalCapabilityMap
  extends RuntimePrimitiveMap,
    CompositeCapabilityMap {}

export interface ApplicationServiceMap {
  database: Database;
  storage: Storage;
  cache: CacheStore;
  rateLimiter: RateLimiter;
  config: Config;
  enums: Enums;
  geo: Geo;
  dataProtection: DataProtection;
}

export type ServiceMap = InternalCapabilityMap;
export type ServiceKey = keyof InternalCapabilityMap;

export const runtimePrimitiveKeys = Object.freeze([
  "database",
  "objectStorage",
  "cache",
  "rateLimiter",
  "geo",
  "dataProtection",
] as const satisfies readonly (keyof RuntimePrimitiveMap)[]);

export const compositeCapabilityKeys = Object.freeze([
  "storage",
  "config",
  "enums",
] as const satisfies readonly (keyof CompositeCapabilityMap)[]);

export const applicationCapabilityAccessors = Object.freeze({
  storage: "getStorage",
  config: "getConfig",
  enums: "getEnums",
} as const satisfies Readonly<Record<keyof CompositeCapabilityMap, string>>);

export const applicationServiceKeys = Object.freeze([
  "database",
  "storage",
  "cache",
  "rateLimiter",
  "config",
  "enums",
  "geo",
  "dataProtection",
] as const satisfies readonly (keyof ApplicationServiceMap)[]);

export const serviceKeys = Object.freeze([
  ...runtimePrimitiveKeys,
  ...compositeCapabilityKeys,
] as const satisfies readonly ServiceKey[]);

const serviceKeyCoverage: Record<
  Exclude<ServiceKey, (typeof serviceKeys)[number]>,
  never
> = {};
void serviceKeyCoverage;

export type RuntimePrimitives = Readonly<Partial<RuntimePrimitiveMap>>;
export type InternalCapabilities = Readonly<Partial<InternalCapabilityMap>>;
export type AppCapabilities = InternalCapabilities;
