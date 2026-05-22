import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import { fetchAllVacationSellerIds } from '@/lib/vacationMode';

/** Supabase OR — csak böngészhető / megvásárolható termékek. */
export const LISTED_PRODUCT_STATUS_FILTER = 'status.eq.active,status.is.null';

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
    query = query.not('user_id', 'in', `(${vacationIds.join(',')})`);
  }

  return query;
}

export type ProductTypeaheadRow = Pick<Product, 'id' | 'name' | 'category' | 'brand'>;

/** Navbar / browse typeahead — ugyanaz a szűrés, mint a katalógus grid. */
export async function fetchListedProductTypeahead(
  supabase: SupabaseClient,
  searchTerm: string,
  limit = 8,
): Promise<ProductTypeaheadRow[]> {
  const trimmed = searchTerm.trim();
  if (trimmed.length < 2) return [];

  const query = await buildListedProductsQuery(supabase, {
    select: 'id, name, category, brand, status',
    search: trimmed,
  });

  const { data, error } = await query.limit(limit);
  if (error || !data) return [];

  return (data as Array<ProductTypeaheadRow & { status?: string | null }>)
    .filter((row) => isListedProduct(row.status))
    .map(({ id, name, category, brand }) => ({ id, name, category, brand }));
}
