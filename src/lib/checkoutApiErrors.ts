import type { TFunction } from 'i18next';

/** Szerver API angol hibaszöveg → i18n kulcs. */
const CHECKOUT_ERROR_KEYS: Record<string, string> = {
  'Stripe configuration is missing': 'checkout.errors.stripeMissing',
  'Service unavailable': 'checkout.errors.serviceUnavailable',
  'Invalid URL: An explicit scheme (such as https) must be provided.':
    'checkout.errors.invalidRedirectUrl',
};

export function mapCheckoutApiError(raw: string | undefined, t: TFunction): string {
  if (!raw?.trim()) return t('checkout.errors.paymentFailed');
  const key = CHECKOUT_ERROR_KEYS[raw.trim()];
  return key ? t(key) : raw;
}
