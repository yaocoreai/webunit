import { startWorkerRuntime } from '../node-job-runtime';

const runtime = await startWorkerRuntime(process.env);
installShutdown(runtime.stop);

function installShutdown(stop: () => Promise<void>) {
  let closing: Promise<void> | undefined;
  const close = () => closing ??= Promise.race([
    stop(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Node Worker shutdown timed out')), 30_000)),
  ]).then(() => { process.exitCode = 0; }, (error) => { console.error(error); process.exitCode = 1; });
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}
