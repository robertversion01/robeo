import type Stripe from 'stripe';

/** Abszolút app URL Stripe redirectekhez, e-mailekhez (mindig http(s) séma). */
export function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL?.trim() ? `https://${process.env.VERCEL_URL.trim()}` : '');

  if (!raw) return 'http://localhost:3000';

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const u = new URL(withScheme);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:3000';
  }
}

export function isConnectAccountReady(account: Stripe.Account): boolean {
  return Boolean(
    account.details_submitted &&
      (account.charges_enabled || account.payouts_enabled),
  );
}
