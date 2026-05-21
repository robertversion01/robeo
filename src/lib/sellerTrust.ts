import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchSellerResponseStats } from '@/lib/sellerResponseTime';

export type SellerTrustSignals = {
  verified: boolean;
  memberSince: string | null;
  listingsCount: number;
  avgRating: number | null;
  reviewCount: number;
  followers: number;
  /** 0–100 heurisztikus bizalmi pont (frontend) */
  trustScore: number;
  activeSeller: boolean;
  responseLabelKey:
    | 'sellerTrust.responseFast'
    | 'sellerTrust.responseNormal'
    | 'sellerTrust.responseSlow'
    | 'sellerTrust.responseNew';
  medianResponseHours: number | null;
};

export function computeTrustScore(input: {
  verified: boolean;
  listingsCount: number;
  reviewCount: number;
  avgRating: number | null;
  followers: number;
}): number {
  let score = 40;
  if (input.verified) score += 15;
  score += Math.min(20, input.listingsCount * 2);
  if (input.avgRating != null && input.reviewCount > 0) {
    score += Math.round((input.avgRating / 5) * 20);
    score += Math.min(10, input.reviewCount);
  }
  score += Math.min(10, Math.floor(input.followers / 5));
  return Math.max(0, Math.min(100, score));
}

export async function fetchSellerTrustSignals(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerTrustSignals> {
  const [profileRes, productsRes, reviewsRes, followersRes, responseStats] = await Promise.all([
    supabase.from('profiles').select('created_at, seller_verified').eq('id', sellerId).maybeSingle(),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', sellerId)
      .or('status.eq.active,status.is.null'),
    supabase.from('reviews').select('rating').eq('reviewed_id', sellerId),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', sellerId),
    fetchSellerResponseStats(supabase, sellerId),
  ]);

  const ratings = (reviewsRes.data || []).map((r) => Number(r.rating)).filter((n) => n > 0);
  const reviewCount = ratings.length;
  const avgRating = reviewCount
    ? ratings.reduce((a, b) => a + b, 0) / reviewCount
    : null;

  const listingsCount = productsRes.count ?? 0;
  const followers = followersRes.count ?? 0;
  const created = profileRes.data?.created_at as string | undefined;
  const verified = Boolean(profileRes.data?.seller_verified);

  const responseLabelKey: SellerTrustSignals['responseLabelKey'] =
    responseStats.sampleCount > 0
      ? responseStats.labelKey
      : listingsCount >= 10
        ? 'sellerTrust.responseNormal'
        : 'sellerTrust.responseNew';

  const trustScore = computeTrustScore({
    verified,
    listingsCount,
    reviewCount,
    avgRating,
    followers,
  });

  return {
    verified,
    memberSince: created || null,
    listingsCount,
    avgRating,
    reviewCount,
    followers,
    trustScore,
    activeSeller: listingsCount >= 1,
    responseLabelKey,
    medianResponseHours: responseStats.medianHours,
  };
}
