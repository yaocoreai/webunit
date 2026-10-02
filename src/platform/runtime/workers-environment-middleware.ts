import { env } from 'cloudflare:workers';
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  (context.locals as { platformEnvironment?: Readonly<Record<string, unknown>> }).platformEnvironment = env;
  return next();
});
