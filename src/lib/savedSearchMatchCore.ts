import type { Product } from '@/types';
import type { SavedSearch } from '@/lib/savedSearches';
import { conditionMatchesFilter } from '@/lib/vintedCatalog';
import { productMatchesCategory } from '@/lib/catalogFilters';

/** Szerver és kliens közös mentett keresés egyezés */
export function productMatchesSavedSearch(
  product: Pick<
    Product,
    'id' | 'name' | 'description' | 'brand' | 'category' | 'size' | 'condition' | 'price'
  >,
  filters: SavedSearch['filters'],
): boolean {
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const hay = `${product.name} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.category !== 'all' && !productMatchesCategory(product.category, filters.category)) {
    return false;
  }
  if (filters.brand !== 'all') {
    const b = (product.brand || '').toLowerCase();
    if (!b.includes(filters.brand.toLowerCase())) return false;
  }
  if (filters.size !== 'all') {
    const s = (product.size || '').toLowerCase();
    if (!s.includes(filters.size.toLowerCase())) return false;
  }
  if (
    filters.condition !== 'all' &&
    !conditionMatchesFilter(product.condition, filters.condition)
  ) {
    return false;
  }
  const price = Number(product.price) || 0;
  if (filters.minPrice > 0 && price < filters.minPrice) return false;
  if (filters.maxPrice > 0 && price > filters.maxPrice) return false;
  return true;
}

export function findNewSavedSearchMatches(
  search: SavedSearch,
  products: Array<
    Pick<
      Product,
      'id' | 'name' | 'description' | 'brand' | 'category' | 'size' | 'condition' | 'price'
    >
  >,
  seenIds: Set<string>,
) {
  return products.filter(
    (p) => productMatchesSavedSearch(p, search.filters) && !seenIds.has(p.id),
  );
}
