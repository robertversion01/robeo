import { VINTED_CONDITIONS } from '@/lib/vintedCatalog';

export const CATEGORY_ALIASES: Record<string, string[]> = {
  clothing: ['clothing', 'ruhazat', 'ruházat', 'clothes'],
  shoes: ['shoes', 'cipo', 'cipő', 'shoe'],
  accessories: ['accessories', 'kiegeszitok', 'kiegészítők', 'accessory'],
  electronics: ['electronics', 'elektronika', 'electronic'],
  other: ['other', 'egyeb', 'egyéb'],
};

export type CatalogFilterState = {
  category: string;
  brand: string;
  size: string;
  condition: string;
  minPrice: number;
  maxPrice: number;
  sort: string;
  search: string;
};

export function normalizeCategory(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Stabil cache-kulcs — React 19 / Next 16 nem cache-elheti el tévesen. */
export function serializeCatalogFilters(filters: CatalogFilterState): string {
  return JSON.stringify({
    category: filters.category,
    brand: filters.brand,
    size: filters.size,
    condition: filters.condition,
    minPrice: Math.round(filters.minPrice || 0),
    maxPrice: Math.round(filters.maxPrice || 0),
    sort: filters.sort,
    search: filters.search.trim().toLowerCase(),
  });
}

export function conditionDbValues(filterId: string): string[] {
  if (filterId === 'all') return [];
  const def = VINTED_CONDITIONS.find((c) => c.id === filterId);
  if (!def) return [filterId];
  return [...new Set([def.id, ...def.aliases])];
}

export function categoryDbValues(filterId: string): string[] {
  if (filterId === 'all') return [];
  return CATEGORY_ALIASES[filterId] || [filterId];
}

export function productMatchesCategory(
  productCategory: string | null | undefined,
  filterId: string,
): boolean {
  if (filterId === 'all') return true;
  const aliases = categoryDbValues(filterId);
  const normalized = normalizeCategory(productCategory || '');
  return aliases.includes(normalized);
}
