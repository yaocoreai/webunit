import type { APIRoute } from 'astro';
import { functionRuntime } from '@/platform/function/runtime';
import { readPlatformEnvironment, resolveServerEnvironment } from '@/platform/runtime/server-environment';

export const POST: APIRoute = async ({ request, locals }) => {
  const environment = await resolveServerEnvironment(readPlatformEnvironment(locals));
  const executionContext = (locals as { cfContext?: { waitUntil(promise: Promise<unknown>): void } }).cfContext;
  return functionRuntime.fetch(request, environment, executionContext);
};

export const ALL: APIRoute = POST;
