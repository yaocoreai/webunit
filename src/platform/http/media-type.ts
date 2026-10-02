export function readMediaType(headers: Headers, name = 'content-type') {
  const value = headers.get(name)?.split(';', 1)[0]?.trim().toLowerCase();
  return value && /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(value) ? value : undefined;
}

export const hasMediaType = (headers: Headers, expected: string) => readMediaType(headers) === expected.toLowerCase();

export function isJsonMediaType(headers: Headers) {
  const value = readMediaType(headers);
  return value === 'application/json' || Boolean(value?.startsWith('application/') && value.endsWith('+json'));
}
