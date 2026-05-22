/** Vinted-szerű ajánlat lejárat — 24 óra. */
export const OFFER_TTL_MS = 24 * 60 * 60 * 1000;

export function offerExpiresAt(from = new Date()): string {
  return new Date(from.getTime() + OFFER_TTL_MS).toISOString();
}

export function isOfferPastExpiry(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return Date.parse(expiresAt) <= Date.now();
}

export function offerRemainingMs(expiresAt: string | null | undefined): number {
  if (!expiresAt) return 0;
  return Math.max(0, Date.parse(expiresAt) - Date.now());
}

export function isOfferAwaitingAction(
  status: string,
  expiresAt: string | null | undefined,
): boolean {
  if (!['pending', 'countered'].includes(status)) return false;
  return !isOfferPastExpiry(expiresAt);
}

export function formatOfferRemaining(
  expiresAt: string | null | undefined,
  locale: string,
): string {
  const ms = offerRemainingMs(expiresAt);
  if (ms <= 0) return '';
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}${locale.startsWith('en') ? 'h' : 'ó'} ${minutes}${locale.startsWith('en') ? 'm' : 'p'}`;
  }
  return `${minutes}${locale.startsWith('en') ? 'm' : 'p'}`;
}

/** Lejárt ajánlatok törlése — cron / worker. */
export async function expireStaleOffers(
  supabase: import('@supabase/supabase-js').SupabaseClient,
): Promise<{ expired: number; error?: string }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('offers')
    .update({
      status: 'cancelled',
      updated_at: now,
    })
    .in('status', ['pending', 'countered'])
    .lt('expires_at', now)
    .select('id');

  if (error) {
    if (error.message?.includes('expires_at') && error.message.includes('does not exist')) {
      return { expired: 0, error: 'expires_at column missing — run supabase/patch-offer-expiry.sql' };
    }
    return { expired: 0, error: error.message };
  }

  return { expired: data?.length ?? 0 };
}
