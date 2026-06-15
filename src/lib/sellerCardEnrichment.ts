import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import { fetchProfileRow } from '@/lib/supabaseResilience';
import { getSellerDisplayName, type SellerDisplayProfile } from '@/lib/sellerProfile';

export type ProductSellerInfo = {
  sellerName: string;
  sellerAvatarUrl: string | null;
};

export type ProductWithSeller = Product & Partial<ProductSellerInfo>;

export async function enrichProductsWithSellerInfo(
  supabase: SupabaseClient,
  products: Product[],
): Promise<ProductWithSeller[]> {
  const sellerIds = [...new Set(products.map((p) => p.user_id).filter(Boolean))];
  if (sellerIds.length === 0) return products;

  const infoMap = new Map<string, ProductSellerInfo>();

  await Promise.all(
    sellerIds.map(async (sellerId) => {
      const profile = await fetchProfileRow<{
        email?: string | null;
        name?: string | null;
        full_name?: string | null;
        avatar_url?: string | null;
      }>(supabase, sellerId, [
        'email, name, avatar_url',
        'email, name, full_name, avatar_url',
        'email, name',
      ]);
      infoMap.set(sellerId, {
        sellerName: getSellerDisplayName(profile as SellerDisplayProfile | null),
        sellerAvatarUrl: profile?.avatar_url?.trim() || null,
      });
    }),
  );

  return products.map((product) => {
    const info = infoMap.get(product.user_id);
    if (!info) return product;
    return { ...product, ...info };
  });
}
