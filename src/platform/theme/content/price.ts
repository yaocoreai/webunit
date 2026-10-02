import type { MetaPriceStoredValue, MetaPriceValue } from '@/platform/theme/define';

export const getCurrencyMinorUnit = (currency: string): number =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;

export const toPriceDecimal = (price: MetaPriceValue): string => {
  const minorUnit = getCurrencyMinorUnit(price.currency);
  const digits = price.amountMinor.toString().padStart(minorUnit + 1, '0');
  if (minorUnit === 0) return digits;
  return `${digits.slice(0, -minorUnit)}.${digits.slice(-minorUnit)}`;
};

export const projectPriceForSeo = (value: unknown): unknown => {
  const price = materializePriceValue(value);
  return price ? { ...price, amount: toPriceDecimal(price) } : value;
};

/** Stored price: amountMinor only. Legacy currency keys are ignored on materialize. */
export function isStoredPriceValue(value: unknown): value is MetaPriceStoredValue & Readonly<{ currency?: unknown }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const price = value as Record<string, unknown>;
  if (!Number.isSafeInteger(price.amountMinor)) return false;
  return Object.keys(price).every((key) => key === 'amountMinor' || key === 'currency');
}

/** Valid persisted price rejects currency; Site.defaultCurrency is authoritative. */
export function isValidStoredPriceValue(value: unknown): value is MetaPriceStoredValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const price = value as Record<string, unknown>;
  return Object.keys(price).length === 1
    && Number.isSafeInteger(price.amountMinor);
}

export function materializePriceValue(value: unknown, currency?: string): MetaPriceValue | undefined {
  if (!isStoredPriceValue(value)) return undefined;
  const resolved = currency
    ?? (typeof value.currency === 'string' && /^[a-z]{3}$/i.test(value.currency) ? value.currency : undefined);
  if (!resolved) return undefined;
  return { amountMinor: Number(value.amountMinor), currency: resolved.toLowerCase() };
}
