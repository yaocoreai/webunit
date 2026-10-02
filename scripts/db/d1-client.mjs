import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export function createD1Client(root, config) {
  const wrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
  const run = (args, retries = 0) => {
    for (let attempt = 0; ; attempt += 1) {
      const result = spawnSync(process.execPath, [wrangler, ...args], {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          NO_COLOR: '1',
          WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || '.wrangler/logs',
        },
      });
      if (result.error) throw result.error;
      if (result.status === 0) return result.stdout;
      const output = `${result.stdout}\n${result.stderr}`.trim();
      if (attempt >= retries || !/(?:fetch failed|request .* timed out|API timed out)/i.test(output))
        throw new Error(output);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000 * (attempt + 1));
    }
  };
  return Object.freeze({
    batch(statements) {
      if (!statements.length) return '';
      return run(['d1', 'execute', 'DB', '--remote', '--config', config, '--command', statements.join(';\n')], 3);
    },
    command(sql) {
      return run(['d1', 'execute', 'DB', '--remote', '--config', config, '--command', sql], 3);
    },
    query(sql) {
      return JSON.parse(run(['d1', 'execute', 'DB', '--remote', '--config', config, '--command', sql, '--json'], 3))
        .flatMap((result) => result.results ?? []);
    },
  });
}

export function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
