import type { Product } from '@/types';
import type { SavedSearch } from '@/lib/savedSearches';
import { conditionMatchesFilter } from '@/lib/vintedCatalog';
import { getBudapestDistrictFilter, productMatchesCategory } from '@/lib/catalogFilters';
import { productMatchesColor } from '@/lib/vintedCategoryTree';
import {
  productMatchesTaxonomySubcategory,
  productMatchesListingTypeFilter,
} from '@/lib/marketplaceTaxonomy';

/** Szerver és kliens közös mentett keresés egyezés */
export function productMatchesSavedSearch(
  product: Pick<
    Product,
    | 'id'
    | 'name'
    | 'description'
    | 'brand'
    | 'category'
    | 'size'
    | 'condition'
    | 'color'
    | 'price'
    | 'budapest_district'
  >,
  filters: SavedSearch['filters'],
): boolean {
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const hay = `${product.name} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (
    filters.listingType &&
    filters.listingType !== 'all' &&
    !productMatchesListingTypeFilter(product.category, filters.listingType)
  ) {
    return false;
  }
  if (filters.category !== 'all' && !productMatchesCategory(product.category, filters.category)) {
    return false;
  }
  if (
    filters.subcategory !== 'all' &&
    !productMatchesTaxonomySubcategory(product.category, filters.subcategory)
  ) {
    return false;
  }
  if (filters.color !== 'all' && !productMatchesColor(product.color, filters.color)) {
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
  const district = getBudapestDistrictFilter(filters);
  if (district && String(product.budapest_district || '').trim().toUpperCase() !== district) {
    return false;
  }
  return true;
}

export function findNewSavedSearchMatches(
  search: SavedSearch,
  products: Array<
    Pick<
      Product,
      | 'id'
      | 'name'
      | 'description'
      | 'brand'
      | 'category'
      | 'size'
      | 'condition'
      | 'color'
      | 'price'
      | 'budapest_district'
    >
  >,
  seenIds: Set<string>,
) {
  return products.filter(
    (p) => productMatchesSavedSearch(p, search.filters) && !seenIds.has(p.id),
  );
}
