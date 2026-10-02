import type { ConsentPurpose } from '@/platform/theme/render/model';

export const consentCookieName = 'privacy_consent';
const purposes: readonly ConsentPurpose[] = ['analytics', 'marketing', 'preferences', 'saleOfData'];

export type StoredConsent = Readonly<{
  version: number;
  decidedAt: string;
  choices: Readonly<Record<ConsentPurpose, boolean>>;
}>;

const listeners = new Set<(consent: StoredConsent | null) => void>();
let previewConsent: StoredConsent | null = null;

export function parseConsent(value: string | undefined, version?: number): StoredConsent | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<StoredConsent>;
    if (!Number.isSafeInteger(parsed.version) || parsed.version! < 1 || (version !== undefined && parsed.version !== version)) return null;
    if (typeof parsed.decidedAt !== 'string' || !Number.isFinite(Date.parse(parsed.decidedAt))) return null;
    if (!parsed.choices || purposes.some((purpose) => typeof parsed.choices?.[purpose] !== 'boolean')) return null;
    return { version: parsed.version!, decidedAt: parsed.decidedAt, choices: Object.fromEntries(purposes.map((purpose) => [purpose, parsed.choices![purpose]])) as Record<ConsentPurpose, boolean> };
  } catch { return null; }
}

export function getConsent(version?: number, preview = false): StoredConsent | null {
  if (preview || typeof document === 'undefined') return previewConsent?.version === version || version === undefined ? previewConsent : null;
  const value = document.cookie.split('; ').find((item) => item.startsWith(`${consentCookieName}=`))?.slice(consentCookieName.length + 1);
  return parseConsent(value, version);
}

export function setConsent(input: StoredConsent, maxAgeDays: number, preview = false): StoredConsent {
  const consent = parseConsent(encodeURIComponent(JSON.stringify(input)), input.version);
  if (!consent) throw new Error('Invalid consent value');
  if (preview) previewConsent = consent;
  else if (typeof document !== 'undefined') document.cookie = `${consentCookieName}=${encodeURIComponent(JSON.stringify(consent))}; Path=/; Max-Age=${Math.floor(maxAgeDays * 86400)}; SameSite=Lax; Secure`;
  for (const listener of listeners) listener(consent);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cms:consent-changed', { detail: consent }));
  return consent;
}

export function clearConsent(preview = false): void {
  if (preview) previewConsent = null;
  else if (typeof document !== 'undefined') document.cookie = `${consentCookieName}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
  for (const listener of listeners) listener(null);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cms:consent-changed', { detail: null }));
}

const decide = (version: number, allowed: boolean): StoredConsent => ({ version, decidedAt: new Date().toISOString(), choices: Object.fromEntries(purposes.map((purpose) => [purpose, allowed])) as Record<ConsentPurpose, boolean> });
export const acceptAllConsent = (version: number, maxAgeDays: number, preview = false) => setConsent(decide(version, true), maxAgeDays, preview);
export const rejectOptionalConsent = (version: number, maxAgeDays: number, preview = false) => setConsent(decide(version, false), maxAgeDays, preview);
export const isConsentAllowed = (required: readonly ConsentPurpose[], consent: StoredConsent | null) => required.every((purpose) => consent?.choices[purpose] === true);
export const subscribeConsent = (listener: (consent: StoredConsent | null) => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export const openConsentPreferences = () => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cms:consent-open-preferences')); };
