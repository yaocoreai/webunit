import type { FunctionHostEffects as ExecutionEffects } from "@/function/common/app/application";
import type { PlatformExecutionContext } from "./execution-context";

const maxBufferedEffects = 128

export type BufferedExecutionEffects = ExecutionEffects & Readonly<{
  drain(): Promise<void>
  pending(): number
}>

export function createBufferedExecutionEffects(
  options: Readonly<{
    capacity?: number
    onError?: (error: unknown) => void
    purgeResponseCache?: ExecutionEffects['purgeResponseCache']
  }> = {},
): BufferedExecutionEffects {
  const capacity = options.capacity ?? maxBufferedEffects
  if (!Number.isSafeInteger(capacity) || capacity < 1) throw new TypeError('ExecutionEffects capacity must be a positive integer')
  const pending = new Set<Promise<void>>()
  const observe = (operation: Promise<unknown>) => Promise.resolve(operation)
    .then(() => undefined, (error) => { (options.onError ?? reportEffectFailure)(error) })
  return Object.freeze({
    defer(operation) {
      const tracked = observe(operation)
      if (pending.size >= capacity) return
      pending.add(tracked)
      void tracked.finally(() => pending.delete(tracked))
    },
    purgeResponseCache: options.purgeResponseCache ?? (async () => undefined),
    drain: async () => { await Promise.all([...pending]) },
    pending: () => pending.size,
  })
}

export function resolveExecutionEffects(
  executionContext?: PlatformExecutionContext,
  purgeResponseCache: ExecutionEffects['purgeResponseCache'] = async () => undefined,
): ExecutionEffects {
  if (!executionContext) return createBufferedExecutionEffects({ purgeResponseCache })
  return Object.freeze({
    defer(operation) {
      executionContext.waitUntil(Promise.resolve(operation).catch(reportEffectFailure))
    },
    purgeResponseCache,
  })
}

function reportEffectFailure(error: unknown) {
  console.warn(JSON.stringify({
    event: 'execution_effect_failed',
    error: error instanceof Error ? error.message : String(error),
  }))
}
