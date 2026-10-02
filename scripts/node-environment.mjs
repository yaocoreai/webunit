import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const workspaceData = fileURLToPath(
  new URL("../../.data/node/", import.meta.url),
);

export function createNodeEnvironment(source = process.env) {
  return {
    ...source,
    NODE_ENV: source.NODE_ENV ?? "development",
    SITE_ORIGIN: source.SITE_ORIGIN ?? "http://localhost:3000",
    FUNCTION_ORIGINS:
      source.FUNCTION_ORIGINS ??
      "http://localhost:3000,http://localhost:3001",
    STORAGE_ORIGIN: source.STORAGE_ORIGIN ?? "http://localhost:3002",
    S3_ENDPOINT: source.S3_ENDPOINT ?? "http://localhost:3002",
    S3_REGION: source.S3_REGION ?? "us-east-1",
    S3_BUCKET: source.S3_BUCKET ?? "webunit-site-local",
    S3_ACCESS_KEY_ID: source.S3_ACCESS_KEY_ID ?? "S3RVER",
    S3_SECRET_ACCESS_KEY: source.S3_SECRET_ACCESS_KEY ?? "S3RVER",
    S3_FORCE_PATH_STYLE: source.S3_FORCE_PATH_STYLE ?? "true",
    WEB_DATABASE_FILE:
      source.WEB_DATABASE_FILE ?? resolve(workspaceData, "site.sqlite"),
    FUNCTION_CACHE_DIR:
      source.FUNCTION_CACHE_DIR ?? resolve(workspaceData, "functions-cache"),
    WEB_DATA_DIR: source.WEB_DATA_DIR ?? resolve(workspaceData, "web"),
  };
}
