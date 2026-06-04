import type { CatalogFilterState } from '@/lib/catalogFilters';
import {
  getBudapestDistrictFilter,
  normalizeDepartmentId,
} from '@/lib/catalogFilters';
import { isValidBudapestDistrict } from '@/lib/budapestDistricts';

const DEFAULTS: CatalogFilterState = {
  category: 'all',
  subcategory: 'all',
  brand: 'all',
  size: 'all',
  condition: 'all',
  color: 'all',
  minPrice: 0,
  maxPrice: 0,
  sort: 'newest',
  search: '',
  budapest_district: 'all',
};

export function parseCatalogFromUrl(params: URLSearchParams): Partial<CatalogFilterState> {
  const next: Partial<CatalogFilterState> = {};

  const q = params.get('q')?.trim();
  if (q) next.search = q;

  const cat = params.get('cat');
  if (cat) next.category = normalizeDepartmentId(cat);

  const sub = params.get('sub');
  if (sub) next.subcategory = sub;

  const brand = params.get('brand');
  if (brand) next.brand = brand;

  const size = params.get('size');
  if (size) next.size = size;

  const cond = params.get('cond') ?? params.get('condition');
  if (cond) next.condition = cond;

  const color = params.get('color');
  if (color) next.color = color;

  const min = params.get('min');
  if (min != null && min !== '') {
    const n = Number(min);
    if (!Number.isNaN(n) && n >= 0) next.minPrice = n;
  }

  const max = params.get('max') ?? params.get('maxPrice');
  if (max != null && max !== '') {
    const n = Number(max);
    if (!Number.isNaN(n) && n > 0) next.maxPrice = n;
  }

  const sort = params.get('sort');
  if (sort) next.sort = sort;

  const district = params.get('district') ?? params.get('ker');
  if (district) {
    const normalized = String(district).trim().toUpperCase();
    if (isValidBudapestDistrict(normalized)) next.budapest_district = normalized;
  }

  return next;
}

export function buildCatalogUrlParams(
  filters: CatalogFilterState,
  maxPriceLimit: number,
): URLSearchParams {
  const params = new URLSearchParams();

  const search = filters.search.trim();
  if (search) params.set('q', search);

  if (filters.category !== DEFAULTS.category) params.set('cat', filters.category);
  if (filters.subcategory !== DEFAULTS.subcategory) params.set('sub', filters.subcategory);
  if (filters.brand !== DEFAULTS.brand) params.set('brand', filters.brand);
  if (filters.size !== DEFAULTS.size) params.set('size', filters.size);
  if (filters.condition !== DEFAULTS.condition) params.set('cond', filters.condition);
  if (filters.color !== DEFAULTS.color) params.set('color', filters.color);
  if (filters.sort !== DEFAULTS.sort) params.set('sort', filters.sort);

  if (filters.minPrice > 0) params.set('min', String(Math.round(filters.minPrice)));
  if (
    filters.maxPrice > 0 &&
    maxPriceLimit > 0 &&
    filters.maxPrice < maxPriceLimit
  ) {
    params.set('max', String(Math.round(filters.maxPrice)));
  }

  const district = getBudapestDistrictFilter(filters);
  if (district) params.set('district', district);

  return params;
}

export function catalogUrlFromFilters(
  filters: CatalogFilterState,
  maxPriceLimit: number,
  pathname = '/',
): string {
  const params = buildCatalogUrlParams(filters, maxPriceLimit);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export { DEFAULTS as CATALOG_FILTER_DEFAULTS };
