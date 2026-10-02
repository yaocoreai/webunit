export type ExecutionEffects = Readonly<{
  defer(operation: Promise<unknown>): void
  purgeResponseCache(input: Readonly<{
    tags?: readonly string[]
    pathPrefixes?: readonly string[]
  }>): Promise<void>
}>
