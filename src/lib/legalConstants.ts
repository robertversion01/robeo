/** Demo / test mode legal & invoicing metadata — not production tax documents. */
export const LEGAL_VERSION = 'v1.1';

export const PRIVACY_LAST_UPDATED = '2026-02-25';

export const DEMO_COMPANY = {
  name: 'ROBEO Marketplace Demo Kft.',
  address: '1051 Budapest, Demo utca 1.',
  taxId: 'DEMO-12345678',
  email: 'demo-szamla@robeo.local',
  registry: 'Cégjegyzékszám: 01-09-999999 (DEMO)',
} as const;

export const LEGAL_CONTACT = {
  privacyEmail: 'adatvedelem@robeo.local',
  supportEmail: DEMO_COMPANY.email,
} as const;

export const COOKIE_CONSENT_STORAGE_KEY = 'robeo_cookie_consent_v1';

export type CookieConsentPrefs = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  acceptedAt: string;
};
