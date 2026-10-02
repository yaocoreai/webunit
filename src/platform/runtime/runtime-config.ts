import type { AdminConfig } from '@/platform/runtime/config/app';
import { createEnv } from './env';

export type RuntimeEnvironment = Readonly<{
  DEV: boolean;
  CMS_CONTENT_TIMEOUT_MS?: string;
  CMS_FUNCTION_TIMEOUT_MS?: string;
  CMS_DOCUMENT_CSP?: string;
  CMS_PERMISSIONS_POLICY?: string;
  CMS_ADMIN_ORIGIN?: string;
  THEME_INTERFACE_KEY?: string;
  WEB_DATA_DIR?: string;
  WEB_CACHE_REDIS_URL?: string;
  WEB_CACHE_REDIS_MAX_CONNECTIONS?: string;
  WEB_CACHE_REDIS_TIMEOUT_MS?: string;
  CMS_TRUST_PROXY?: string;
}>;

export function readTrustProxy(environment: RuntimeEnvironment | undefined = import.meta.env): boolean {
  const value = environment?.CMS_TRUST_PROXY?.trim().toLowerCase();
  if (!value) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('CMS_TRUST_PROXY must be true or false');
}

const normalizeHttpOrigin = (value: string, variable: string) => {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${variable} must use HTTP or HTTPS`);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${variable} must be an origin without credentials, path, query, or fragment`);
  }
  return url.origin;
};

export function readContentTimeoutMs(environment: RuntimeEnvironment = import.meta.env) {
  const timeoutMs = createEnv(environment)('CMS_CONTENT_TIMEOUT_MS', 15_000, { parse: parseInteger });
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
    throw new Error('CMS_CONTENT_TIMEOUT_MS must be an integer between 100 and 60000');
  }
  return timeoutMs;
}

export function readFunctionTimeoutMs(environment: RuntimeEnvironment = import.meta.env) {
  const timeoutMs = createEnv(environment)('CMS_FUNCTION_TIMEOUT_MS', 15_000, { parse: parseInteger });
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
    throw new Error('CMS_FUNCTION_TIMEOUT_MS must be an integer between 100 and 60000');
  }
  return timeoutMs;
}

export function readAdminConfig(environment: RuntimeEnvironment = import.meta.env): AdminConfig {
  const env = createEnv(environment);
  const origin = env('CMS_ADMIN_ORIGIN', environment.DEV ? 'http://localhost:3001' : undefined, { parse: parseHttpOrigin });
  if (!origin) throw new Error('CMS_ADMIN_ORIGIN is required');
  return { origin };
}

export function readThemeSettingKey(
  environment: RuntimeEnvironment = import.meta.env,
) {
  return createEnv(environment)("THEME_INTERFACE_KEY");
}

function parseHttpOrigin(value: unknown, key: string) {
  if (typeof value !== 'string') throw new Error('must be a string');
  return normalizeHttpOrigin(value, key);
}

function parseInteger(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  throw new Error('must be an integer');
}
