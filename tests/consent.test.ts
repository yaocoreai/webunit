import assert from 'node:assert/strict';
import test from 'node:test';
import { clearConsent, getConsent, isConsentAllowed, parseConsent, setConsent } from '@/platform/theme/consent/browser';
import { shouldDisplayConsent } from '@/platform/theme/consent/policy';

test('consent parser enforces version and complete choices', () => {
  const value = encodeURIComponent(JSON.stringify({ version: 2, decidedAt: '2026-08-01T00:00:00.000Z', choices: { analytics: true, marketing: false, preferences: true, saleOfData: false } }));
  const consent = parseConsent(value, 2);
  assert.equal(consent?.choices.analytics, true);
  assert.equal(parseConsent(value, 1), null);
  assert.equal(parseConsent(encodeURIComponent(JSON.stringify({ version: 2, decidedAt: '2026-08-01T00:00:00.000Z', choices: { analytics: true } })), 2), null);
  assert.equal(isConsentAllowed(['analytics', 'preferences'], consent), true);
  assert.equal(isConsentAllowed(['marketing'], consent), false);
});

test('consent region display handles always, never, matching and unknown regions', () => {
  const base = { enabled: true, privacyPolicy: { type: 'path', title: 'Privacy', target: '_self', href: '/privacy', resource: null }, version: 1, maxAgeDays: 180, messages: {} } as never;
  assert.equal(shouldDisplayConsent({ ...base, display: { mode: 'always' } }), true);
  assert.equal(shouldDisplayConsent({ ...base, display: { mode: 'never' } }), false);
  const regions = { ...base, display: { mode: 'regions', countryCodes: ['de'], regionCodes: ['us-ca'], unknownRegion: 'show' } } as never;
  assert.equal(shouldDisplayConsent(regions, { countryCode: 'DE' }), true);
  assert.equal(shouldDisplayConsent(regions, { countryCode: 'US', regionCode: 'CA' }), true);
  assert.equal(shouldDisplayConsent(regions, { countryCode: 'US', regionCode: 'NY' }), false);
  assert.equal(shouldDisplayConsent(regions), true);
});

test('preview consent can be changed and withdrawn without a real cookie', () => {
  const consent = { version: 3, decidedAt: '2026-08-01T00:00:00.000Z', choices: { analytics: true, marketing: false, preferences: true, saleOfData: false } } as const;
  setConsent(consent, 180, true);
  assert.deepEqual(getConsent(3, true), consent);
  clearConsent(true);
  assert.equal(getConsent(3, true), null);
});
