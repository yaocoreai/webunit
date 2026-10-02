export class CapabilityUnavailableError extends Error {
  readonly key: string;

  constructor(key: string) {
    super(`Required capability is unavailable: ${key}`);
    this.name = 'CapabilityUnavailableError';
    this.key = key;
  }
}
