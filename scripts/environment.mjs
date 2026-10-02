import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";

const platforms = new Set(["node", "container", "cloudflare"]);
const sourceRoot = new URL("../", import.meta.url);
export const cloudflareEnvironmentFile = new URL(".env.cloudflare", sourceRoot);

export function platformEnvironmentDirectory(platform, root) {
  if (!platforms.has(platform))
    throw new Error(`Unknown environment platform: ${platform}`);
  return platform === "cloudflare" ? sourceRoot : root;
}

export async function loadPlatformEnvironment(
  platform,
  root,
  target = process.env,
) {
  const envRoot = platformEnvironmentDirectory(platform, root);
  try {
    const values = parseEnv(
      await readFile(new URL(`.env.${platform}`, envRoot), "utf8"),
    );
    for (const [key, value] of Object.entries(values))
      if (target[key] === undefined) target[key] = value;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const origins = ["SITE_ORIGIN", "ADMIN_ORIGIN", "STORAGE_ORIGIN", "THEME_ORIGIN"].flatMap(
    (name) =>
      target[name] ? [[name, normalizeOrigin(target[name], platform)]] : [],
  );
  if (new Set(origins.map(([, origin]) => origin)).size !== origins.length)
    throw new Error(
      `${platform} development origins must be distinct`,
    );
  for (const [name, origin] of origins) target[name] = origin;
  const adminOrigin = target.ADMIN_ORIGIN;
  const storageOrigin = target.STORAGE_ORIGIN;
  if (adminOrigin) target.CMS_ADMIN_ORIGIN ??= adminOrigin;
  if (platform === "node" && storageOrigin)
    target.S3_ENDPOINT ??= storageOrigin;
  return target;
}

function normalizeOrigin(value, platform) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== value)
    throw new Error(
      `${platform} origin must be an absolute HTTP or HTTPS origin: ${value}`,
    );
  if (platform !== "node" && url.protocol !== "https:")
    throw new Error(`${platform} origins must use HTTPS: ${value}`);
  return url.origin;
}
