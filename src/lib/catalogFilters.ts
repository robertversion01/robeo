import { VINTED_CONDITIONS } from '@/lib/vintedCatalog';
import {
  LEGACY_CATEGORY_TO_DEPARTMENT,
  productMatchesDepartment,
  productMatchesSubcategory,
  productMatchesColor,
  departmentDbAliases,
  subcategoryDbAliases,
} from '@/lib/vintedCategoryTree';

/** @deprecated — régi flat aliasok; új fa: vintedCategoryTree */
export const CATEGORY_ALIASES: Record<string, string[]> = {
  clothing: ['clothing', 'ruhazat', 'ruházat', 'clothes'],
  shoes: ['shoes', 'cipo', 'cipő', 'shoe'],
  accessories: ['accessories', 'kiegeszitok', 'kiegészítők', 'accessory'],
  electronics: ['electronics', 'elektronika', 'electronic'],
  other: ['other', 'egyeb', 'egyéb'],
};

export type CatalogFilterState = {
  /** Fő kategória (department): women, men, kids, … */
  category: string;
  /** Alkategória: women_dresses, men_shoes, … */
  subcategory: string;
  brand: string;
  size: string;
  condition: string;
  color: string;
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

/** Régi URL / flat kategória → department. */
export function normalizeDepartmentId(value: string): string {
  if (value === 'all') return 'all';
  if (LEGACY_CATEGORY_TO_DEPARTMENT[value]) return LEGACY_CATEGORY_TO_DEPARTMENT[value];
  return value;
}

export function serializeCatalogFilters(filters: CatalogFilterState): string {
  return JSON.stringify({
    category: filters.category,
    subcategory: filters.subcategory,
    brand: filters.brand,
    size: filters.size,
    condition: filters.condition,
    color: filters.color,
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
  const dept = normalizeDepartmentId(filterId);
  const fromTree = departmentDbAliases(dept);
  if (fromTree.length > 0) return fromTree;
  return CATEGORY_ALIASES[filterId] || [filterId];
}

export function subcategoryFilterDbValues(subcategoryId: string): string[] {
  return subcategoryDbAliases(subcategoryId);
}

export function productMatchesCategory(
  productCategory: string | null | undefined,
  filterId: string,
): boolean {
  return productMatchesDepartment(productCategory, normalizeDepartmentId(filterId));
}

export function productMatchesCatalogFilters(
  product: {
    category?: string | null;
    condition?: string | null;
    color?: string | null;
    size?: string | null;
  },
  filters: Pick<CatalogFilterState, 'category' | 'subcategory' | 'color'>,
): boolean {
  if (!productMatchesDepartment(product.category, filters.category)) return false;
  if (!productMatchesSubcategory(product.category, filters.subcategory)) return false;
  if (!productMatchesColor(product.color, filters.color)) return false;
  return true;
}
