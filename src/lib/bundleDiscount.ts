import { DEFAULT_BUNDLE_TIERS, type BundleTier } from '@/lib/vintedCatalog';

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
