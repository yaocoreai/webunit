import { createServer } from 'node:net';

export async function assertOriginsAvailable(origins) {
  const seen = new Set();
  for (const [name, origin] of origins) {
    const url = new URL(origin);
    const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
    if (seen.has(port)) throw new Error(`Development origins share port ${port}: ${name}`);
    seen.add(port);
    await assertPortAvailable(name, port);
  }
}

async function assertPortAvailable(name, port) {
  const server = createServer();
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') throw new Error(`${name} development port ${port} is already in use`);
    throw error;
  } finally {
    if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}
