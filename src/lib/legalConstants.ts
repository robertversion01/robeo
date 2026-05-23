/** Demo / test mode legal & invoicing metadata — not production tax documents. */
export const LEGAL_VERSION = 'v1.2';

export const PRIVACY_LAST_UPDATED = '2026-02-25';

export const PAY_TERMS_VERSION = 'v1.0';

export const COOKIE_POLICY_LAST_UPDATED = '2026-02-25';

/** Belső hivatkozás a díjak leírásához (checkout / profil) */
export const PAY_FEES_URL = '/help#fees';

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
