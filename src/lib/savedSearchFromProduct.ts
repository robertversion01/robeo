import type { Product } from '@/types';
import type { SavedSearch } from '@/lib/savedSearches';
import { CATEGORY_ALIASES, normalizeCategory, normalizeDepartmentId } from '@/lib/catalogFilters';

function resolveCategoryFilterId(raw: string | null | undefined): string {
  if (!raw?.trim()) return 'all';
  const norm = normalizeCategory(raw);
  for (const [id, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.includes(norm)) return id;
  }
  const dept = normalizeDepartmentId(raw);
  return dept && dept !== 'all' ? dept : 'other';
}

/** Termek alapjan smart mentett kereses — hasonlo arsav, marka, meret, kerulet. */
export function buildSavedSearchFiltersFromProduct(
  product: Pick<
    Product,
    | 'category'
    | 'brand'
    | 'size'
    | 'condition'
    | 'color'
    | 'price'
    | 'budapest_district'
  >,
): SavedSearch['filters'] {
  const price = Math.max(0, Number(product.price) || 0);
  const minPrice = price > 0 ? Math.floor(price * 0.65) : 0;
  const maxPrice = price > 0 ? Math.ceil(price * 1.35) : 0;

  return {
    listingType: 'all',
    category: resolveCategoryFilterId(product.category),
    subcategory: 'all',
    brand: product.brand?.trim() || 'all',
    size: product.size?.trim() || 'all',
    condition: product.condition?.trim() || 'all',
    color: product.color?.trim() || 'all',
    minPrice,
    maxPrice,
    sort: 'newest',
    search: '',
    budapest_district: product.budapest_district?.trim() || 'all',
  };
}
