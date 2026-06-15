import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchSellerResponseStats } from '@/lib/sellerResponseTime';
import { fetchProfileRow } from '@/lib/supabaseResilience';

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
  lastActiveAt: string | null;
  profileCompleteness: number;
  medianResponseHours: number | null;
  responseSampleCount: number;
  responseLabelKey:
    | 'sellerTrust.responseFast'
    | 'sellerTrust.responseNormal'
    | 'sellerTrust.responseSlow'
    | 'sellerTrust.responseNew';
};

export function computeTrustScore(input: {
  verified: boolean;
  listingsCount: number;
  reviewCount: number;
  avgRating: number | null;
  followers: number;
  profileCompleteness?: number;
  recentlyActive?: boolean;
}): number {
  let score = 40;
  if (input.verified) score += 15;
  score += Math.min(20, input.listingsCount * 2);
  if (input.avgRating != null && input.reviewCount > 0) {
    score += Math.round((input.avgRating / 5) * 20);
    score += Math.min(10, input.reviewCount);
  }
  score += Math.min(10, Math.floor(input.followers / 5));
  if (input.profileCompleteness != null) {
    score += Math.round((input.profileCompleteness / 100) * 10);
  }
  if (input.recentlyActive) score += 5;
  return Math.max(0, Math.min(100, score));
}

function computeProfileCompleteness(profile: {
  bio?: string | null;
  avatar_url?: string | null;
  name?: string | null;
  full_name?: string | null;
} | null): number {
  if (!profile) return 0;
  let score = 0;
  if (profile.name?.trim() || profile.full_name?.trim()) score += 35;
  if (profile.bio?.trim()) score += 35;
  if (profile.avatar_url?.trim()) score += 30;
  return score;
}

function isRecentlyActive(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false;
  const hours = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60);
  return hours >= 0 && hours <= 72;
}

export async function fetchSellerTrustSignals(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerTrustSignals> {
  const [profileRes, productsRes, reviewsRes, followersRes, responseStats, profileDetail] =
    await Promise.all([
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
      fetchProfileRow<{
        bio?: string | null;
        avatar_url?: string | null;
        name?: string | null;
        full_name?: string | null;
        last_active_at?: string | null;
      }>(supabase, sellerId, [
        'bio, avatar_url, name, full_name, last_active_at',
        'bio, avatar_url, name, full_name',
        'bio, name, full_name',
      ]),
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
  const lastActiveAt = profileDetail?.last_active_at || null;
  const profileCompleteness = computeProfileCompleteness(profileDetail);
  const recentlyActive = isRecentlyActive(lastActiveAt);

  const responseLabelKey = responseStats.labelKey;
  const medianResponseHours = responseStats.medianHours;
  const responseSampleCount = responseStats.sampleCount;

  const trustScore = computeTrustScore({
    verified,
    listingsCount,
    reviewCount,
    avgRating,
    followers,
    profileCompleteness,
    recentlyActive,
  });

  return {
    verified,
    memberSince: created || null,
    listingsCount,
    avgRating,
    reviewCount,
    followers,
    trustScore,
    activeSeller: recentlyActive || listingsCount >= 3,
    lastActiveAt,
    profileCompleteness,
    medianResponseHours,
    responseSampleCount,
    responseLabelKey,
  };
}
