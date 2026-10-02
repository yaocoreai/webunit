import { asRecord } from '@/platform/theme/render/value';

const maxDepth = 12;
const maxStringLength = 10_000;
const maxListLength = 100;

/** Rejects malformed postMessage values before they reach the preview DOM. */
export function isSafePreviewValue(value: unknown, depth = 0): boolean {
  if (depth > maxDepth) return false;
  if (typeof value === 'string') return value.length <= maxStringLength;
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return true;
  if (Array.isArray(value)) return value.length <= maxListLength && value.every((item) => isSafePreviewValue(item, depth + 1));
  const record = asRecord(value);
  return record !== undefined && Object.values(record).every((item) => isSafePreviewValue(item, depth + 1));
}
