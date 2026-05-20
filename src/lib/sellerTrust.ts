import type { SupabaseClient } from '@supabase/supabase-js';

export type SellerTrustSignals = {
  verified: boolean;
  memberSince: string | null;
  listingsCount: number;
  avgRating: number | null;
  reviewCount: number;
  followers: number;
  /** Frontend becslés — nincs külön DB mező */
  responseLabelKey: 'sellerTrust.responseFast' | 'sellerTrust.responseNormal' | 'sellerTrust.responseNew';
};

export async function fetchSellerTrustSignals(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerTrustSignals> {
  const [profileRes, productsRes, reviewsRes, followersRes] = await Promise.all([
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

  let responseLabelKey: SellerTrustSignals['responseLabelKey'] = 'sellerTrust.responseNew';
  if (reviewCount >= 5 || listingsCount >= 10) {
    responseLabelKey = 'sellerTrust.responseFast';
  } else if (listingsCount >= 3) {
    responseLabelKey = 'sellerTrust.responseNormal';
  }

  return {
    verified,
    memberSince: created || null,
    listingsCount,
    avgRating,
    reviewCount,
    followers,
    responseLabelKey,
  };
}
