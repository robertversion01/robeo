import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_BUNDLE_TIERS, type BundleTier } from '@/lib/vintedCatalog';

export type SellerBundleDiscountSettings = {
  enabled: boolean;
  tiers: BundleTier[];
};

const DEFAULT_SELLER_BUNDLE: SellerBundleDiscountSettings = {
  enabled: false,
  tiers: [...DEFAULT_BUNDLE_TIERS],
};

function isMissingProfileColumnError(error: { code?: string; message?: string } | null): boolean {
  const msg = error?.message?.toLowerCase() ?? '';
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    msg.includes('column') ||
    msg.includes('does not exist')
  );
}

/** Rugalmas lekérés — ha a patch még nincs futtatva, nem dob 400-at a checkout. */
export async function fetchSellerBundleDiscountSettings(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerBundleDiscountSettings> {
  const { data, error } = await supabase
    .from('profiles')
    .select('bundle_discount_enabled, bundle_discount_tiers')
    .eq('id', sellerId)
    .maybeSingle();

  if (!error) {
    return {
      enabled: Boolean(data?.bundle_discount_enabled),
      tiers: parseBundleTiers(data?.bundle_discount_tiers),
    };
  }

  if (isMissingProfileColumnError(error)) {
    return DEFAULT_SELLER_BUNDLE;
  }

  console.warn('[bundleDiscount] profiles select failed', error.message);
  return DEFAULT_SELLER_BUNDLE;
}

export function parseBundleTiers(raw: unknown): BundleTier[] {
  if (!Array.isArray(raw)) return [...DEFAULT_BUNDLE_TIERS];
  const parsed = raw
    .map((t) => {
      const row = t as { items?: number; percent?: number };
      const items = Math.round(Number(row.items) || 0);
      const percent = Math.round(Number(row.percent) || 0);
      if (items < 2 || percent < 1 || percent > 50) return null;
      return { items, percent };
    })
    .filter((t): t is BundleTier => t !== null);
  return parsed.length > 0 ? parsed : [...DEFAULT_BUNDLE_TIERS];
}

/** Legmagasabb elérhető kedvezmény % a darabszámhoz. */
export function bundleDiscountPercentForCount(
  tiers: BundleTier[],
  itemCount: number,
): number {
  const count = Math.max(1, Math.round(itemCount));
  let best = 0;
  for (const tier of tiers) {
    if (count >= tier.items && tier.percent > best) {
      best = tier.percent;
    }
  }
  return best;
}

export function applyBundleDiscountToPrice(priceHuf: number, discountPercent: number): number {
  const base = Math.max(0, Math.round(priceHuf));
  const pct = Math.min(50, Math.max(0, Math.round(discountPercent)));
  return Math.max(0, Math.round(base * (1 - pct / 100)));
}
