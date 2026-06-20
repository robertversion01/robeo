import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import { fetchProfileRow } from '@/lib/supabaseResilience';
import { getSellerDisplayName, type SellerDisplayProfile } from '@/lib/sellerProfile';

export type ProductSellerInfo = {
  sellerName: string;
  sellerAvatarUrl: string | null;
  sellerVerified: boolean;
  sellerAvgRating: number | null;
  sellerReviewCount: number;
};

async function fetchSellerRatingBatch(
  supabase: SupabaseClient,
  sellerIds: string[],
): Promise<Map<string, { avg: number; count: number }>> {
  if (sellerIds.length === 0) return new Map();
  const { data } = await supabase
    .from('reviews')
    .select('reviewed_id, rating')
    .in('reviewed_id', sellerIds);
  const buckets = new Map<string, number[]>();
  for (const row of data || []) {
    const id = row.reviewed_id as string | undefined;
    const rating = Number(row.rating);
    if (!id || rating <= 0) continue;
    const list = buckets.get(id) ?? [];
    list.push(rating);
    buckets.set(id, list);
  }
  const out = new Map<string, { avg: number; count: number }>();
  for (const [id, ratings] of buckets) {
    out.set(id, {
      avg: ratings.reduce((sum, n) => sum + n, 0) / ratings.length,
      count: ratings.length,
    });
  }
  return out;
}

export type ProductWithSeller = Product & Partial<ProductSellerInfo>;

export async function enrichProductsWithSellerInfo(
  supabase: SupabaseClient,
  products: Product[],
): Promise<ProductWithSeller[]> {
  const sellerIds = [...new Set(products.map((p) => p.user_id).filter(Boolean))];
  if (sellerIds.length === 0) return products;

  const infoMap = new Map<string, ProductSellerInfo>();
  const ratingMap = await fetchSellerRatingBatch(supabase, sellerIds);

  await Promise.all(
    sellerIds.map(async (sellerId) => {
      const profile = await fetchProfileRow<{
        email?: string | null;
        name?: string | null;
        full_name?: string | null;
        avatar_url?: string | null;
        seller_verified?: boolean | null;
      }>(supabase, sellerId, [
        'email, name, avatar_url, seller_verified',
        'email, name, full_name, avatar_url, seller_verified',
        'email, name, avatar_url',
        'email, name, full_name, avatar_url',
        'email, name',
      ]);
      const rating = ratingMap.get(sellerId);
      infoMap.set(sellerId, {
        sellerName: getSellerDisplayName(profile as SellerDisplayProfile | null),
        sellerAvatarUrl: profile?.avatar_url?.trim() || null,
        sellerVerified: Boolean(profile?.seller_verified),
        sellerAvgRating: rating?.avg ?? null,
        sellerReviewCount: rating?.count ?? 0,
      });
    }),
  );

  return products.map((product) => {
    const info = infoMap.get(product.user_id);
    if (!info) return product;
    return { ...product, ...info };
  });
}
