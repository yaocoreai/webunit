export type DurableObjectStorage = Readonly<{
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  deleteAll(): Promise<void>;
  setAlarm(time: number | Date): Promise<void>;
}>;

export type DurableObjectState = Readonly<{ storage: DurableObjectStorage }>;
export type DurableObjectStub = Readonly<{ fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> }>;
export type DurableObjectNamespace = Readonly<{
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStub;
}>;
