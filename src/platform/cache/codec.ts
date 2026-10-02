export const jsonRowEncoding = 'json-row';

export type JsonRowEncoding = typeof jsonRowEncoding;

export type EncodedJsonRow = Readonly<{
  encoding: JsonRowEncoding;
  raw: string;
}>;

export function encodeJsonRow(value: unknown): EncodedJsonRow {
  const raw = JSON.stringify([value], assertJsonCompatibleValue);

  if (raw === undefined) throw new Error('Cannot encode JSON value');
  return { encoding: jsonRowEncoding, raw };
}

export function decodeJsonRow(record: EncodedJsonRow): unknown {
  if (record.encoding !== jsonRowEncoding) throw new Error(`Unsupported value encoding: ${record.encoding}`);
  const row = JSON.parse(record.raw) as unknown;
  if (!Array.isArray(row) || row.length !== 1) throw new Error('Invalid json-row value');
  return row[0];
}

function assertJsonCompatibleValue(_key: string, value: unknown): unknown {
  if (value === undefined) throw new Error('Cannot encode undefined JSON value');
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    throw new Error(`Cannot encode ${typeof value} JSON value`);
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('Cannot encode non-finite JSON number');
  }
  return value;
}
