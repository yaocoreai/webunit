declare module 'virtual:webunit-astro-entry' {
  type WorkerExecutionContext = Readonly<{ waitUntil(promise: Promise<unknown>): void }>;

  const worker: Readonly<{
    fetch(
      request: Request,
      env: Readonly<Record<string, unknown>>,
      context: WorkerExecutionContext,
    ): Promise<Response>;
  }>;

  export default worker;
}
