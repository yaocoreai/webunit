export function memoizeAsync<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    if (pending) return pending;
    const current = load();
    pending = current;
    current.catch(() => {
      if (pending === current) pending = undefined;
    });
    return current;
  };
}

export function memoizeRequired<T>(
  load: () => Promise<T | undefined>,
  message: string,
): () => Promise<T> {
  return memoizeAsync(async () => {
    const value = await load();
    if (value === undefined) throw new Error(message);
    return value;
  });
}
