import type { ConsentMessages, ResolvedConsent } from '@/platform/theme/render/model';
import { useRenderRuntime } from '@/platform/theme/render/context';

export type ConsentSettings = Readonly<{
  enabled: boolean;
  display: ResolvedConsent['display'];
  messages: ConsentMessages;
  privacyPolicy: ResolvedConsent['privacyPolicy'];
  cookiePolicy?: ResolvedConsent['cookiePolicy'];
  cookie: Readonly<{ name: 'privacy_consent'; version: number; maxAgeDays: number }>;
  preview: boolean;
}>;

type AstroContext = Readonly<{ locals: object }>;

export function useConsent(astro: AstroContext): ConsentSettings | undefined {
  const runtime = useRenderRuntime(astro.locals);
  const consent = runtime.payload.consent;
  if (!consent) return undefined;
  const preview = runtime.context.environment !== 'production';
  return {
    enabled: consent.enabled,
    display: consent.display,
    messages: consent.messages,
    privacyPolicy: consent.privacyPolicy,
    ...consent.cookiePolicy ? { cookiePolicy: consent.cookiePolicy } : {},
    cookie: { name: 'privacy_consent', version: consent.version, maxAgeDays: consent.maxAgeDays },
    preview,
  };
}
