import type { Product } from '@/types';

function norm(s: string | null | undefined) {
  return (s || '').trim();
}

/** Top márkák / méretek a betöltött katalógusból */
export function computeDiscoveryChips(products: Product[], limit = 8) {
  const brandCount = new Map<string, number>();
  const sizeCount = new Map<string, number>();

  for (const p of products) {
    const b = norm(p.brand);
    if (b) brandCount.set(b, (brandCount.get(b) || 0) + 1);
    const s = norm(p.size);
    if (s) sizeCount.set(s, (sizeCount.get(s) || 0) + 1);
  }

  const topBrands = [...brandCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);

  const topSizes = [...sizeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);

  return { topBrands, topSizes };
}

export const PRICE_RAIL_CHIPS = [
  { id: 'under3k', max: 3000, labelKey: 'browse.discovery.under3k' },
  { id: 'under10k', max: 10000, labelKey: 'browse.discovery.under10k' },
  { id: 'under20k', max: 20000, labelKey: 'browse.discovery.under20k' },
] as const;
