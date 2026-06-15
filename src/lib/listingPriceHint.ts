import type { SupabaseClient } from '@supabase/supabase-js';
import { LISTED_PRODUCT_STATUS_FILTER } from '@/lib/listedProducts';
import { conditionDbValues } from '@/lib/catalogFilters';

export type SimilarPriceHint = {
  median: number;
  min: number;
  max: number;
  sampleCount: number;
};

/**
 * Hasonló aktív hirdetések ár-statisztikája (medián) — determinista, nincs AI.
 */
export async function fetchSimilarPriceHint(
  supabase: SupabaseClient,
  input: {
    category?: string;
    brand?: string;
    condition?: string;
    listingType?: 'product' | 'service';
  },
): Promise<SimilarPriceHint | null> {
  const category = input.category?.trim();
  if (!category) return null;

  let query = supabase
    .from('products')
    .select('price')
    .or(LISTED_PRODUCT_STATUS_FILTER)
    .eq('category', category)
    .gt('price', 0)
    .limit(120);

  if (input.listingType === 'service') {
    query = query.ilike('category', 'svc%');
  } else if (input.listingType === 'product') {
    query = query.not('category', 'ilike', 'svc%');
  }

  const brand = input.brand?.trim();
  if (brand && brand !== 'Egyéb' && brand !== 'Other') {
    query = query.ilike('brand', brand);
  }

  if (input.condition && input.condition !== 'all') {
    const condValues = conditionDbValues(input.condition);
    if (condValues.length === 1) query = query.eq('condition', condValues[0]);
    else if (condValues.length > 1) query = query.in('condition', condValues);
  }

  const { data, error } = await query;
  if (error || !data?.length) return null;

  const prices = data
    .map((row) => Math.round(Number((row as { price?: number }).price) || 0))
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  if (prices.length < 2) return null;

  const mid = Math.floor(prices.length / 2);
  const median =
    prices.length % 2 === 0 ? Math.round((prices[mid - 1] + prices[mid]) / 2) : prices[mid];

  return {
    median,
    min: prices[0],
    max: prices[prices.length - 1],
    sampleCount: prices.length,
  };
}

export function formatPriceHintRange(hint: SimilarPriceHint): { low: number; high: number } {
  const spread = Math.max(500, Math.round(hint.median * 0.15));
  return {
    low: Math.max(100, hint.median - spread),
    high: hint.median + spread,
  };
}
