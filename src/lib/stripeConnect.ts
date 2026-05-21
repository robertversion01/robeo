import type Stripe from 'stripe';

export function appBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export function isConnectAccountReady(account: Stripe.Account): boolean {
  return Boolean(
    account.details_submitted &&
      (account.charges_enabled || account.payouts_enabled),
  );
}
