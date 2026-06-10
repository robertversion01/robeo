import { VINTED_CONDITIONS } from '@/lib/vintedCatalog';
import {
  LEGACY_CATEGORY_TO_DEPARTMENT,
  productMatchesColor,
} from '@/lib/vintedCategoryTree';
import {
  type ListingType,
  productMatchesListingTypeFilter,
  productMatchesTaxonomyDepartment,
  productMatchesTaxonomySubcategory,
  departmentDbAliasesForTaxonomy,
  subcategoryDbAliasesForTaxonomy,
} from '@/lib/marketplaceTaxonomy';

/** @deprecated — régi flat aliasok; új fa: vintedCategoryTree */
export const CATEGORY_ALIASES: Record<string, string[]> = {
  clothing: ['clothing', 'ruhazat', 'ruházat', 'clothes'],
  shoes: ['shoes', 'cipo', 'cipő', 'shoe'],
  accessories: ['accessories', 'kiegeszitok', 'kiegészítők', 'accessory'],
  electronics: ['electronics', 'elektronika', 'electronic'],
  other: ['other', 'egyeb', 'egyéb'],
};

export type CatalogFilterState = {
  /** Termék / szolgáltatás / mind */
  listingType: 'all' | ListingType;
  /** Fő kategória (department): women, men, kids, svc_home, … */
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
  /**
   * RobeoBP (Budapest Beta) only — kerület szűrő.
   * Opcionális mező, hogy a meglévő `CatalogFilterState` literal objektek
   * (Navbar, BrowseDiscoveryRails stb.) ne törjenek. 'all' vagy hiányzik →
   * minden kerület. Római szám (I…XXIII) → adott kerület.
   */
  budapest_district?: string;
};

/** Egységes olvasás: undefined/'' / 'all' → null, egyébként a normalizált érték. */
export function getBudapestDistrictFilter(
  filters: Pick<CatalogFilterState, 'budapest_district'>,
): string | null {
  const v = filters.budapest_district;
  if (!v || v === 'all') return null;
  return String(v).trim().toUpperCase() || null;
}

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
    listingType: filters.listingType ?? 'all',
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
    budapest_district: getBudapestDistrictFilter(filters) ?? 'all',
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
  const fromTree = departmentDbAliasesForTaxonomy(dept);
  if (fromTree.length > 0) return fromTree;
  return CATEGORY_ALIASES[filterId] || [filterId];
}

export function subcategoryFilterDbValues(subcategoryId: string): string[] {
  return subcategoryDbAliasesForTaxonomy(subcategoryId);
}

export function productMatchesCategory(
  productCategory: string | null | undefined,
  filterId: string,
): boolean {
  return productMatchesTaxonomyDepartment(productCategory, normalizeDepartmentId(filterId));
}

export function productMatchesCatalogFilters(
  product: {
    category?: string | null;
    condition?: string | null;
    color?: string | null;
    size?: string | null;
  },
  filters: Pick<CatalogFilterState, 'listingType' | 'category' | 'subcategory' | 'color'>,
): boolean {
  if (!productMatchesListingTypeFilter(product.category, filters.listingType ?? 'all')) return false;
  if (!productMatchesTaxonomyDepartment(product.category, filters.category)) return false;
  if (!productMatchesTaxonomySubcategory(product.category, filters.subcategory)) return false;
  if (!productMatchesColor(product.color, filters.color)) return false;
  return true;
}
