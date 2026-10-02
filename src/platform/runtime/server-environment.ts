import type { RuntimeEnvironment } from './runtime-config';

export type ServerEnvironment = RuntimeEnvironment & Readonly<Record<string, unknown>>;

export function mergeServerEnvironment(
  embedded: Readonly<Record<string, unknown>>,
  runtime?: Readonly<Record<string, unknown>>,
): ServerEnvironment {
  const result: Record<string, unknown> = {};
  for (const source of [embedded, runtime]) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'string') {
        if (value.trim()) result[key] = value;
      } else if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
  }
  return result as ServerEnvironment;
}

export function readPlatformEnvironment(locals?: object): Readonly<Record<string, unknown>> | undefined {
  const environment = (locals as { platformEnvironment?: unknown } | undefined)?.platformEnvironment;
  return environment && typeof environment === 'object'
    ? environment as Readonly<Record<string, unknown>>
    : undefined;
}

export async function resolveServerEnvironment(runtime?: Readonly<Record<string, unknown>>): Promise<ServerEnvironment> {
  const embedded = import.meta.env ?? {};
  const nodeEnvironment = typeof process === 'object' ? process.env : undefined;
  const serverEnvironment = mergeServerEnvironment(embedded, nodeEnvironment);
  return runtime ? mergeServerEnvironment(serverEnvironment, runtime) : serverEnvironment;
}
