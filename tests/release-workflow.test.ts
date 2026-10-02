import assert from 'node:assert/strict'
import test from 'node:test'

import { releaseActivationCommands, releasePreparationCommands, releaseTargets } from '../scripts/release/workflow.mjs'

test('all release targets prepare resources before activating Background definitions', () => {
  assert.deepEqual(releaseTargets, ['node', 'container', 'cloudflare'])
  for (const target of releaseTargets) {
    const prepare = releasePreparationCommands(target)
    const activate = releaseActivationCommands(target)
    assert.deepEqual(prepare.slice(0, 3), [
      `db:migrate:${target}`,
      `db:seed:${target}`,
      `queue:prepare:${target}`,
    ])
    assert.equal(prepare.some((command) => command.startsWith('jobs:')), false)
    assert.deepEqual(activate.slice(0, 2), [`jobs:sync:${target}`, `jobs:audit:${target}`])
    assert.equal([...prepare, ...activate].some((command) => /:(?:dev|prod|production|test)$/.test(command)), false)
  }
})
