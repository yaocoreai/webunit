import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { loadPlatformEnvironment } from './environment.mjs'
import { assertReleaseTarget, releaseActivationCommands } from './release/workflow.mjs'

const target = assertReleaseTarget(process.argv[2])

const root = resolve(import.meta.dirname, '..')
await loadPlatformEnvironment(target, new URL('../../', import.meta.url))
process.env.NODE_ENV = 'production'

// Activation must run only after the new runtime is deployed. It is the only
// release phase allowed to project new Job and Schedule definitions as active.
for (const command of releaseActivationCommands(target)) run('pnpm', [command])

console.info(JSON.stringify({ event: 'release_activate_completed', target }))

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, env: process.env, stdio: 'inherit' })
  if (result.error) throw result.error
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1)
}
