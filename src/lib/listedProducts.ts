import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import {
  categoryDbValues,
  conditionDbValues,
  getBudapestDistrictFilter,
  subcategoryFilterDbValues,
} from '@/lib/catalogFilters';
import { fetchAllVacationSellerIds } from '@/lib/vacationMode';
import { colorDbAliases } from '@/lib/vintedCategoryTree';

/** Supabase OR — csak böngészhető / megvásárolható termékek. */
export const LISTED_PRODUCT_STATUS_FILTER = 'status.eq.active,status.is.null';

/** Feed katalógus — vékony select (nincs description / defect_images a listában). */
export const CATALOG_PRODUCT_SELECT =
  'id,name,price,category,condition,brand,image_url,images,user_id,status,featured_until,size,color,favorite_count,budapest_district,created_at,updated_at';

/** Saját shop — csak még eladható hirdetések (sold külön szekció). */
export const ACTIVE_LISTING_STATUS_FILTER = LISTED_PRODUCT_STATUS_FILTER;

/** Csak aktív katalógus — soft-deleted és sold kizárva. */
export function isListedProduct(status: string | null | undefined): boolean {
  if (status === 'sold' || status === 'deleted') return false;
  return status === 'active' || status == null;
}

export function isActiveListing(status: string | null | undefined): boolean {
  return status === 'active' || status == null;
}

export function isSoldListing(status: string | null | undefined): boolean {
  return status === 'sold';
}

/** Megvásárolható-e (checkout / ajánlat). */
export function isPurchasableProduct(status: string | null | undefined): boolean {
  return isListedProduct(status);
}

/** Kiemelés / boost — kizárólag aktív hirdetés. */
export function canPromoteProduct(status: string | null | undefined): boolean {
  return isActiveListing(status);
}

/** PDP — böngészhető vagy eladó saját sold hirdetése. */
export function canViewProductDetail(
  status: string | null | undefined,
  viewerId: string | null | undefined,
  ownerId: string,
): boolean {
  if (isListedProduct(status)) return true;
  return isSoldListing(status) && viewerId === ownerId;
}

export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProductQuery = any;

export function applyListedProductFilter(query: ProductQuery): ProductQuery {
  return query.or(LISTED_PRODUCT_STATUS_FILTER);
}

export function applyProductTextSearch(query: ProductQuery, searchTerm: string): ProductQuery {
  const trimmed = searchTerm.trim();
  if (!trimmed) return query;
  const escaped = escapeIlikePattern(trimmed);
  return query.or(
    `name.ilike.%${escaped}%,description.ilike.%${escaped}%,brand.ilike.%${escaped}%`,
  );
}

function buildCategoryAliasOr(aliases: string[]) {
  if (aliases.length === 0) return null;
  return aliases
    .map((alias) => `category.ilike.%${alias.replace(/[%_\\]/g, '\\$&')}%`)
    .join(',');
}

/** Szolgáltatás / termék szétválasztás — `svc%` prefix (LIKE, nem regex). */
export function applyListingTypeFilter(
  query: ProductQuery,
  listingType: CatalogFilterState['listingType'],
): ProductQuery {
  if (listingType === 'service') return query.ilike('category', 'svc%');
  if (listingType === 'product') return query.not('category', 'ilike', 'svc%');
  return query;
}

export function applyVacationSellerExclusion(query: ProductQuery, vacationIds: string[]): ProductQuery {
  if (vacationIds.length === 0) return query;
  const list = vacationIds.map((id) => `"${id}"`).join(',');
  return query.not('user_id', 'in', `(${list})`);
}

export type CatalogQueryFilterOptions = {
  exclude?: 'category' | 'subcategory' | 'brand' | 'none';
  vacationIds?: string[];
  sizeFilterOnServer?: boolean;
  /** RobeoBP kerület szűrő szerver-oldalon — csak ha az oszlop létezik. Alap: true. */
  districtFilterOnServer?: boolean;
};

/** Közös katalógus szűrők — szinkron, hogy a builder ne legyen await-elve (thenable!). */
export function applyCatalogFiltersToProductQuery(
  query: ProductQuery,
  filters: CatalogFilterState,
  options: CatalogQueryFilterOptions = {},
): ProductQuery {
  const exclude = options.exclude ?? 'none';
  const isService = filters.listingType === 'service';

  query = applyListingTypeFilter(query, filters.listingType ?? 'all');

  if ((exclude === 'none' || exclude !== 'brand') && !isService && filters.brand !== 'all') {
    query = query.ilike('brand', filters.brand);
  }

  const searchTerm = filters.search.trim();
  if (searchTerm) {
    query = applyProductTextSearch(query, searchTerm);
  }

  if (!isService && filters.condition !== 'all') {
    const condValues = conditionDbValues(filters.condition);
    if (condValues.length === 1) {
      query = query.eq('condition', condValues[0]);
    } else if (condValues.length > 1) {
      query = query.in('condition', condValues);
    }
  }

  if (!isService && filters.color !== 'all') {
    const colorAliases = colorDbAliases(filters.color);
    const colorOr = colorAliases
      .map((alias) => `color.ilike.%${alias}%`)
      .join(',');
    if (colorOr) query = query.or(colorOr);
  }

  if (!isService && filters.size !== 'all' && options.sizeFilterOnServer) {
    query = query.ilike('size', filters.size);
  }

  if (filters.minPrice > 0) {
    query = query.gte('price', filters.minPrice);
  }

  if (filters.maxPrice > 0) {
    query = query.lte('price', filters.maxPrice);
  }

  if ((exclude === 'none' || exclude !== 'category') && filters.category !== 'all') {
    const or = buildCategoryAliasOr(categoryDbValues(filters.category));
    if (or) query = query.or(or);
  }

  if ((exclude === 'none' || exclude !== 'subcategory') && filters.subcategory !== 'all') {
    const or = buildCategoryAliasOr(subcategoryFilterDbValues(filters.subcategory));
    if (or) query = query.or(or);
  }

  const district = getBudapestDistrictFilter(filters);
  if (district && (options.districtFilterOnServer ?? true)) {
    query = query.eq('budapest_district', district);
  }

  if (options.vacationIds && options.vacationIds.length > 0) {
    query = applyVacationSellerExclusion(query, options.vacationIds);
  }

  return query;
}

export function isSupabaseRangeError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  const code = (error.code ?? '').toUpperCase();
  return code === 'PGRST103' || msg.includes('range not satisfiable') || msg.includes('requested range');
}

export function formatSupabaseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (!error || typeof error !== 'object') return String(error);
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  return [e.message, e.code && `(${e.code})`, e.details].filter(Boolean).join(' ') || 'Unknown error';
}

/** Közös browse/search query építő — aktív státusz + opcionális szöveg + vacation kizárás. */
export async function buildListedProductsQuery(
  supabase: SupabaseClient,
  options: {
    select: string;
    search?: string;
    count?: 'exact';
    head?: boolean;
  },
): Promise<ProductQuery> {
  let query = supabase.from('products').select(options.select, {
    count: options.count,
    head: options.head,
  });

  query = applyListedProductFilter(query);

  if (options.search?.trim()) {
    query = applyProductTextSearch(query, options.search);
  }

  const vacationIds = await fetchAllVacationSellerIds(supabase);
  if (vacationIds.length > 0) {
    query = applyVacationSellerExclusion(query, vacationIds);
  }

  return query;
}

export type ProductTypeaheadRow = Pick<
  Product,
  'id' | 'name' | 'category' | 'brand' | 'price' | 'image_url' | 'images'
>;

/** Navbar / browse typeahead — ugyanaz a szűrés, mint a katalógus grid. */
export async function fetchListedProductTypeahead(
  supabase: SupabaseClient,
  searchTerm: string,
  limit = 8,
): Promise<ProductTypeaheadRow[]> {
  const trimmed = searchTerm.trim();
  if (trimmed.length < 2) return [];

  const query = await buildListedProductsQuery(supabase, {
    select: 'id, name, category, brand, price, image_url, images, status',
    search: trimmed,
  });

  const { data, error } = await query.limit(limit);
  if (error || !data) return [];

  return (data as Array<ProductTypeaheadRow & { status?: string | null }>)
    .filter((row) => isListedProduct(row.status))
    .map(({ id, name, category, brand, price, image_url, images }) => ({
      id,
      name,
      category,
      brand,
      price,
      image_url,
      images,
    }));
}
