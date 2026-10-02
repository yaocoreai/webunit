export function getData<T>(data: Readonly<Record<string, T>>, key: string): T | undefined {
  return data[key];
}
