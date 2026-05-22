import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';

/** Kedvencek száma termékenként — egy batch lekérdezés a gridhez. */
export async function fetchFavoriteCountsByProductIds(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Record<string, number>> {
  if (productIds.length === 0) return {};

  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .in('product_id', productIds);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    const id = String(row.product_id);
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

export async function enrichProductsWithFavoriteCounts(
  supabase: SupabaseClient,
  products: Product[],
): Promise<Product[]> {
  if (products.length === 0) return products;

  const counts = await fetchFavoriteCountsByProductIds(
    supabase,
    products.map((p) => p.id),
  );

  return products.map((p) => ({
    ...p,
    favorite_count: counts[p.id] ?? Math.max(0, Number(p.favorite_count) || 0),
  }));
}

export function adjustProductFavoriteCount(products: Product[], productId: string, delta: number): Product[] {
  return products.map((p) =>
    p.id === productId
      ? { ...p, favorite_count: Math.max(0, (Number(p.favorite_count) || 0) + delta) }
      : p,
  );
}
