export function readTrustedClientIp(
  request: Request,
  trustedHeaders: readonly string[] | undefined,
): string | undefined {
  for (const header of trustedHeaders ?? []) {
    const value = readOptionalRequestHeader(request, header)
      ?.split(",", 1)[0]
      ?.trim();
    if (value) return value;
  }
  return undefined;
}

export function readOptionalRequestHeader(
  request: Request,
  name: string,
): string | undefined {
  const value = request.headers.get(name)?.trim();
  return value ? value.slice(0, 1024) : undefined;
}
