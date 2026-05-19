import type { SupabaseClient } from '@supabase/supabase-js';

export const MESSAGES_LAST_SEEN_KEY = (userId: string) =>
  `messages_last_seen_at_${userId}`;

export function readLastSeenAt(userId: string): string {
  if (typeof window === 'undefined') return '1970-01-01T00:00:00.000Z';
  return localStorage.getItem(MESSAGES_LAST_SEEN_KEY(userId)) || '1970-01-01T00:00:00.000Z';
}

export function writeLastSeenAt(userId: string, iso: string = new Date().toISOString()): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MESSAGES_LAST_SEEN_KEY(userId), iso);
}

/** Olvasatlan üzenetek + eladói pending ajánlatok + vevői countered ajánlatok. */
export async function fetchUnreadCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const lastSeen = readLastSeenAt(userId);

  const [
    { count: messageCount, error: messageError },
    { count: sellerOfferCount, error: sellerOfferError },
    { count: buyerCounterCount, error: buyerCounterError },
  ] = await Promise.all([
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .gt('created_at', lastSeen),
    supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('status', 'pending')
      .gt('created_at', lastSeen),
    supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .eq('status', 'countered')
      .gt('updated_at', lastSeen),
  ]);

  if (messageError || sellerOfferError || buyerCounterError) {
    console.warn('[unread] count failed', {
      messageError: messageError?.message,
      sellerOfferError: sellerOfferError?.message,
      buyerCounterError: buyerCounterError?.message,
    });
    return 0;
  }

  return (messageCount ?? 0) + (sellerOfferCount ?? 0) + (buyerCounterCount ?? 0);
}

export function offerAmountFromRow(row: Record<string, unknown>): number {
  const offered = Number(row.offered_price);
  if (Number.isFinite(offered) && offered > 0) return Math.round(offered);
  const legacy = Number(row.price);
  if (Number.isFinite(legacy) && legacy > 0) return Math.round(legacy);
  return 0;
}
