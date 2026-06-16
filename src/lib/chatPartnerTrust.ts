import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Könnyű, gyors bizalmi jel a chat-partnerről (megerősített + értékelés).
 * Szándékosan NEM számol válaszidőt (az N+1 lekérdezés lenne) — csak 2 olcsó query.
 * Hiányzó oszlop/tábla esetén üresen tér vissza (graceful, nincs crash).
 */
export type ChatPartnerTrust = {
  verified: boolean;
  avgRating: number | null;
  reviewCount: number;
};

const EMPTY: ChatPartnerTrust = { verified: false, avgRating: null, reviewCount: 0 };

export async function fetchChatPartnerTrust(
  supabase: SupabaseClient,
  userId: string,
): Promise<ChatPartnerTrust> {
  if (!userId) return EMPTY;

  const [profileRes, reviewsRes] = await Promise.allSettled([
    supabase.from('profiles').select('seller_verified').eq('id', userId).maybeSingle(),
    supabase.from('reviews').select('rating').eq('reviewed_id', userId),
  ]);

  const verified =
    profileRes.status === 'fulfilled'
      ? Boolean((profileRes.value.data as { seller_verified?: boolean } | null)?.seller_verified)
      : false;

  let avgRating: number | null = null;
  let reviewCount = 0;
  if (reviewsRes.status === 'fulfilled') {
    const ratings = ((reviewsRes.value.data as { rating: number }[] | null) ?? [])
      .map((r) => Number(r.rating))
      .filter((n) => Number.isFinite(n) && n > 0);
    reviewCount = ratings.length;
    if (reviewCount > 0) {
      avgRating = ratings.reduce((sum, n) => sum + n, 0) / reviewCount;
    }
  }

  return { verified, avgRating, reviewCount };
}
