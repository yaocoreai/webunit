import astro from 'virtual:webunit-astro-entry';
export {
  WebunitRateLimitDurableObject,
} from "@/function/infrastructure/workers/entry";

type WorkerExecutionContext = Readonly<{ waitUntil(promise: Promise<unknown>): void }>;

export default {
  async fetch(request: Request, env: Readonly<Record<string, unknown>>, context: WorkerExecutionContext) {
    return astro.fetch(request, env, context);
  },
};
