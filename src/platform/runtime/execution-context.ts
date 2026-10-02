export type PlatformExecutionContext = Readonly<{
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?: () => void;
}>;
