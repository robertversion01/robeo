import type { SupabaseClient } from '@supabase/supabase-js';
import type { DiscoveryChipStat } from '@/lib/discoveryStats';
import { LISTED_PRODUCT_STATUS_FILTER } from '@/lib/listedProducts';

function norm(s: string | null | undefined) {
  return (s || '').trim();
}

/** Globális trending — nem csak az aktuális lap termékei alapján. */
export async function fetchGlobalDiscoveryChips(
  db: SupabaseClient,
  limit = 10,
): Promise<{ topBrands: DiscoveryChipStat[]; topSizes: DiscoveryChipStat[] }> {
  const { data, error } = await db
    .from('products')
    .select('brand, size')
    .or(LISTED_PRODUCT_STATUS_FILTER)
    .order('created_at', { ascending: false })
    .limit(600);

  if (error || !data) {
    return { topBrands: [], topSizes: [] };
  }

  const brandCount = new Map<string, number>();
  const sizeCount = new Map<string, number>();

  for (const row of data) {
    const b = norm(row.brand as string | null);
    if (b) brandCount.set(b, (brandCount.get(b) || 0) + 1);
    const s = norm(row.size as string | null);
    if (s) sizeCount.set(s, (sizeCount.get(s) || 0) + 1);
  }

  const topBrands = [...brandCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

  const topSizes = [...sizeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

  return { topBrands, topSizes };
}
