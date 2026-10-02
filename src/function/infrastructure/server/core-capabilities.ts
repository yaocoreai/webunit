import type { RuntimePrimitives } from "@/function/common/capabilities/contracts";
import { createLazyGeo, createLazyObjectStorage } from "@/function/common/capabilities/lazy";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { createSqliteDatabase } from "./sqlite-database";
import { observeDatabase } from "@/function/common/db/observability";
import { createDataProtection } from "@/function/common/data-protection/service";

export function createServerCoreCapabilities(
  environment: Readonly<Record<string, unknown>>,
): RuntimePrimitives {
  const storageDriver = readStorageDriver(environment.STORAGE_DRIVER);
  const databaseFile =
    readOptionalString(environment.WEB_DATABASE_FILE) ??
    resolve(process.cwd(), ".data/webunit.sqlite");
  const storageDirectory =
    readOptionalString(environment.WEB_STORAGE_DIR) ??
    resolve(process.cwd(), ".data/storage");
  const s3 =
    storageDriver === "filesystem" ? undefined : readS3Config(environment);
  if (storageDriver === "s3" && !s3)
    throw new Error("S3_ENDPOINT is required when STORAGE_DRIVER=s3");
  const geo = readGeoConfig(environment);
  const dataProtection = createDataProtection(environment.FUNCTION_DATA_PROTECTION_KEY);
  let database: NonNullable<RuntimePrimitives["database"]>;
  const objectStorage = createLazyObjectStorage(
    async () =>
      s3
        ? (await import("./s3-storage")).createS3Storage(s3)
        : (await import("./filesystem-storage")).createFilesystemStorage(
            storageDirectory,
          ),
    {
      signedPut: Boolean(s3),
      signedUploadPart: Boolean(s3),
      signedGet: Boolean(s3),
    },
  );
  const capabilities = Object.defineProperties(
    {},
    {
      database: {
        enumerable: true,
        get() {
          if (!database) {
            mkdirSync(dirname(databaseFile), { recursive: true });
            database = observeDatabase(createSqliteDatabase(databaseFile));
          }
          return database;
        },
      },
      objectStorage: { enumerable: true, value: objectStorage },
      ...(geo
        ? {
            geo: {
              enumerable: true,
              value: createLazyGeo(
                async () => (await import("./mmdb-geo")).createNodeMmdbGeo(geo),
                {
                  provider: "maxmind-mmdb",
                  availability: {
                    country: Boolean(geo.countryDbPath || geo.cityDbPath),
                    city: Boolean(geo.cityDbPath),
                    asn: Boolean(geo.asnDbPath),
                  },
                },
              ),
            },
          }
        : {}),
      ...(dataProtection
        ? { dataProtection: { enumerable: true, value: dataProtection } }
        : {}),
    },
  ) as RuntimePrimitives;
  return capabilities;
}

export function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readS3Config(environment: Readonly<Record<string, unknown>>) {
  const endpoint = readOptionalString(environment.S3_ENDPOINT);
  if (!endpoint) return undefined;
  const bucket = requiredString(environment.S3_BUCKET, "S3_BUCKET");
  const accessKeyId = requiredString(
    environment.S3_ACCESS_KEY_ID,
    "S3_ACCESS_KEY_ID",
  );
  const secretAccessKey = requiredString(
    environment.S3_SECRET_ACCESS_KEY,
    "S3_SECRET_ACCESS_KEY",
  );
  const url = new URL(endpoint);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== endpoint)
    throw new Error("S3_ENDPOINT must be an HTTP or HTTPS origin");
  return {
    endpoint,
    publicEndpoint:
      readOptionalString(environment.S3_PUBLIC_ENDPOINT) ?? endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region: readOptionalString(environment.S3_REGION) ?? "us-east-1",
    forcePathStyle: environment.S3_FORCE_PATH_STYLE !== "false",
  };
}
function requiredString(value: unknown, name: string) {
  const result = readOptionalString(value);
  if (!result)
    throw new Error(`${name} is required when its S3 endpoint is configured`);
  return result;
}
function readStorageDriver(value: unknown): "auto" | "filesystem" | "s3" {
  const driver = readOptionalString(value) ?? "auto";
  if (driver !== "auto" && driver !== "filesystem" && driver !== "s3")
    throw new Error(`Unsupported Storage driver: ${driver}`);
  return driver;
}
function readGeoConfig(environment: Readonly<Record<string, unknown>>) {
  const countryDbPath = readOptionalString(environment.GEOIP_COUNTRY_DB_PATH);
  const cityDbPath = readOptionalString(environment.GEOIP_CITY_DB_PATH);
  const asnDbPath = readOptionalString(environment.GEOIP_ASN_DB_PATH);
  return countryDbPath || cityDbPath || asnDbPath
    ? { countryDbPath, cityDbPath, asnDbPath }
    : undefined;
}
