/** Vinted-szerű ajánlat lejárat — 24 óra. */
export const OFFER_TTL_MS = 24 * 60 * 60 * 1000;

export function offerExpiresAt(from = new Date()): string {
  return new Date(from.getTime() + OFFER_TTL_MS).toISOString();
}

export function isOfferPastExpiry(
  expiresAt: string | null | undefined,
  createdAt?: string | null,
): boolean {
  if (expiresAt) return Date.parse(expiresAt) <= Date.now();
  if (createdAt) return Date.parse(createdAt) + OFFER_TTL_MS <= Date.now();
  return false;
}

export function offerRemainingMs(
  expiresAt: string | null | undefined,
  createdAt?: string | null,
): number {
  const effective = effectiveOfferExpiresAt(expiresAt, createdAt);
  if (!effective) return 0;
  return Math.max(0, Date.parse(effective) - Date.now());
}

/** Legacy sorokhoz: ha nincs expires_at, created_at + TTL. */
export function effectiveOfferExpiresAt(
  expiresAt: string | null | undefined,
  createdAt?: string | null,
): string | null {
  if (expiresAt) return expiresAt;
  if (!createdAt) return null;
  return new Date(Date.parse(createdAt) + OFFER_TTL_MS).toISOString();
}

export function isOfferAwaitingAction(
  status: string,
  expiresAt: string | null | undefined,
  createdAt?: string | null,
): boolean {
  if (!['pending', 'countered'].includes(status)) return false;
  return !isOfferPastExpiry(expiresAt, createdAt);
}

export function formatOfferRemaining(
  expiresAt: string | null | undefined,
  locale: string,
  createdAt?: string | null,
): string {
  const ms = offerRemainingMs(expiresAt, createdAt);
  if (ms <= 0) return '';
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}${locale.startsWith('en') ? 'h' : 'ó'} ${minutes}${locale.startsWith('en') ? 'm' : 'p'}`;
  }
  return `${minutes}${locale.startsWith('en') ? 'm' : 'p'}`;
}

type StaleOfferRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  offered_price: number;
  status: string;
};

/** Lejárt ajánlatok törlése — cron / worker + chat értesítés. */
export async function expireStaleOffers(
  supabase: import('@supabase/supabase-js').SupabaseClient,
): Promise<{ expired: number; error?: string }> {
  const now = new Date().toISOString();
  const legacyCutoff = new Date(Date.now() - OFFER_TTL_MS).toISOString();

  const { data: staleByExpiry, error: selectError } = await supabase
    .from('offers')
    .select('id, buyer_id, seller_id, product_id, offered_price, status')
    .in('status', ['pending', 'countered'])
    .lt('expires_at', now);

  const { data: legacyStale } = await supabase
    .from('offers')
    .select('id, buyer_id, seller_id, product_id, offered_price, status')
    .in('status', ['pending', 'countered'])
    .is('expires_at', null)
    .lt('created_at', legacyCutoff);

  if (selectError) {
    if (selectError.message?.includes('expires_at') && selectError.message.includes('does not exist')) {
      return { expired: 0, error: 'expires_at column missing — run supabase/patch-offer-expiry.sql' };
    }
    return { expired: 0, error: selectError.message };
  }

  const rows = [...((staleByExpiry || []) as StaleOfferRow[]), ...((legacyStale || []) as StaleOfferRow[])];
  const uniqueRows = [...new Map(rows.map((r) => [r.id, r])).values()];
  if (uniqueRows.length === 0) return { expired: 0 };

  const { insertChatSystemMessage } = await import('@/lib/chatMessages');

  for (const offer of uniqueRows) {
    const price = offer.offered_price.toLocaleString('hu-HU');
    const content =
      offer.status === 'countered'
        ? `Az ellenajánlat (${price} Ft) lejárt — 24 óra után automatikusan megszűnt.`
        : `Az ajánlat (${price} Ft) lejárt — 24 óra után automatikusan megszűnt.`;

    await insertChatSystemMessage(supabase, {
      senderId: offer.seller_id,
      receiverId: offer.buyer_id,
      content,
      productId: offer.product_id,
    });
  }

  const { data, error } = await supabase
    .from('offers')
    .update({
      status: 'cancelled',
      updated_at: now,
    })
    .in(
      'id',
      uniqueRows.map((r) => r.id),
    )
    .select('id');

  if (error) {
    return { expired: 0, error: error.message };
  }

  return { expired: data?.length ?? 0 };
}
