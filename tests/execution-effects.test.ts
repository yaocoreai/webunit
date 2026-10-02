import assert from 'node:assert/strict'
import test from 'node:test'

import { createBufferedExecutionEffects, resolveExecutionEffects } from '@/platform/runtime/execution-effects'

test('Workers ExecutionEffects delegates observed work to waitUntil', async () => {
  const pending: Promise<unknown>[] = []
  const purges: unknown[] = []
  const effects = resolveExecutionEffects(
    { waitUntil: (operation) => pending.push(operation) },
    async (input) => { purges.push(input) },
  )
  let completed = false
  effects.defer(Promise.resolve().then(() => { completed = true }))
  assert.equal(pending.length, 1)
  await Promise.all(pending)
  assert.equal(completed, true)
  await effects.purgeResponseCache({ tags: ['cms:site:1'] })
  assert.deepEqual(purges, [{ tags: ['cms:site:1'] }])
})

test('Node ExecutionEffects exposes a bounded observable buffer for shutdown and tests', async () => {
  const errors: unknown[] = []
  const effects = createBufferedExecutionEffects({ capacity: 2, onError: (error) => errors.push(error) })
  let release!: () => void
  effects.defer(new Promise<void>((resolve) => { release = resolve }))
  effects.defer(Promise.reject(new Error('expected')))
  effects.defer(Promise.resolve())
  assert.equal(effects.pending(), 2)
  release()
  await effects.drain()
  assert.equal(effects.pending(), 0)
  assert.equal((errors[0] as Error).message, 'expected')
})
