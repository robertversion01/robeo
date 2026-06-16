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
  if (sub?.labelKey) {
    return t(sub.labelKey, { defaultValue: subcategoryId.replace(/_/g, ' ') });
  }
  return subcategoryId.replace(/_/g, ' ');
}

/**
 * Egységes kategória-címke tetszőleges nyers id-hez (department, alkategória,
 * legacy flat id vagy DB-ben tárolt kategória). Mindig lokalizált címkét ad,
 * soha nem szivárogtat nyers angol id-t (men/kids/home stb.).
 */
export function categoryDisplayLabel(
  t: TFunction,
  rawId: string | null | undefined,
): string {
  if (!rawId) return '';
  const id = String(rawId).trim();
  if (!id) return '';
  if (id === 'all') return t('browse.filters.allCategories', { defaultValue: id });

  const sub = getSubcategoryByTaxonomyId(id);
  if (sub?.labelKey) {
    return t(sub.labelKey, { defaultValue: id.replace(/_/g, ' ') });
  }

  if (id.startsWith(SERVICE_CATEGORY_PREFIX)) {
    return t(departmentI18nKey(id), { defaultValue: id.replace(/_/g, ' ') });
  }

  // Termék-department (browse.departments.*) vagy legacy flat (browse.categories.*).
  return t([`browse.departments.${id}`, `browse.categories.${id}`], {
    defaultValue: id.replace(/_/g, ' '),
  });
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
