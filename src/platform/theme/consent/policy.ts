import type { ResolvedConsent } from '@/platform/theme/render/model';

export type ConsentGeo = Readonly<{ countryCode?: string; regionCode?: string }>;

export function shouldDisplayConsent(consent: Pick<ResolvedConsent, 'enabled' | 'display'>, geo?: ConsentGeo): boolean {
  if (!consent.enabled || consent.display.mode === 'never') return false;
  if (consent.display.mode === 'always') return true;
  const country = geo?.countryCode?.toLowerCase();
  const region = geo?.regionCode?.toLowerCase();
  const compositeRegion = country && region ? `${country}-${region}` : undefined;
  if (!country) return consent.display.unknownRegion === 'show';
  return consent.display.countryCodes.includes(country)
    || Boolean(region && consent.display.regionCodes?.includes(region))
    || Boolean(compositeRegion && consent.display.regionCodes?.includes(compositeRegion));
}
