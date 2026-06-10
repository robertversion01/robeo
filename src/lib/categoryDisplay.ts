import type { TFunction } from 'i18next';
import {
  SERVICE_CATEGORY_PREFIX,
  getSubcategoryByTaxonomyId,
} from '@/lib/marketplaceTaxonomy';

/** i18n kulcs department ID-hez (termék + szolgáltatás). */
export function departmentI18nKey(departmentId: string): string {
  if (departmentId === 'all') return 'browse.filters.allCategories';
  if (departmentId.startsWith(SERVICE_CATEGORY_PREFIX)) {
    const suffix = departmentId.slice(SERVICE_CATEGORY_PREFIX.length);
    return `browse.serviceDepartments.${suffix}`;
  }
  return `browse.departments.${departmentId}`;
}

export function departmentLabel(
  t: TFunction,
  departmentId: string,
  fallback?: string,
): string {
  return t(departmentI18nKey(departmentId), { defaultValue: fallback ?? departmentId });
}

export function subcategoryLabel(t: TFunction, subcategoryId: string): string {
  if (subcategoryId === 'all') return t('browse.filters.allSubcategories');
  const sub = getSubcategoryByTaxonomyId(subcategoryId);
  if (sub?.labelKey) return t(sub.labelKey);
  return subcategoryId;
}

export function isServiceListingMode(
  listingType?: 'all' | 'product' | 'service',
): boolean {
  return listingType === 'service';
}

export function showProductCatalogFilters(
  listingType?: 'all' | 'product' | 'service',
): boolean {
  return listingType !== 'service';
}
