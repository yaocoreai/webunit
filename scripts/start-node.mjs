import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadPlatformEnvironment } from "./environment.mjs";
import { createNodeEnvironment } from "./node-environment.mjs";

await loadPlatformEnvironment("node", new URL("../../", import.meta.url));
const appRoot = fileURLToPath(new URL("..", import.meta.url));
const role = process.argv[2] ?? 'all';
if (!['web', 'worker', 'all'].includes(role)) throw new Error('Node role must be web, worker, or all');
const environment = createNodeEnvironment({
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? "production",
  HOST: process.env.HOST ?? "0.0.0.0",
  PORT: process.env.PORT ?? "3000",
});
const entries = role === 'all'
  ? ['dist/server/node-entry.mjs']
  : [role === 'web' ? 'dist/server/entry.mjs' : 'dist/server/worker-entry.mjs'];
const children = entries.map((entry) => spawn(process.execPath, [entry], { cwd: appRoot, env: environment, stdio: 'inherit' }));
let closing = false;
for (const child of children) {
  child.once('error', fail);
  child.once('exit', (code, signal) => {
    if (!closing && (signal || code !== 0)) fail(new Error(`Node ${role} process exited (${signal ?? code})`));
  });
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
function fail(error) { console.error(error); process.exitCode = 1; close(); }
function close() { if (closing) return; closing = true; for (const child of children) if (child.exitCode === null) child.kill('SIGTERM'); }
