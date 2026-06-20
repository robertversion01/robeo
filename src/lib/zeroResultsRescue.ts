import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import {
  applyListedProductFilter,
  buildListedProductsQuery,
} from '@/lib/listedProducts';
import { filterProductsWithValidImages } from '@/lib/productImageValidation';
import { categoryDbValues } from '@/lib/catalogFilters';

const SELECT =
  'id, name, price, image_url, images, brand, size, category, status, user_id, created_at';

/** Üres találat mentő — lazább kulcsszó / kategória alapú közeli termékek. */
export async function fetchZeroResultsRescueProducts(
  supabase: SupabaseClient,
  input: {
    searchQuery?: string;
    category?: string;
    brand?: string;
    limit?: number;
  },
): Promise<Product[]> {
  const limit = input.limit ?? 8;
  const search = input.searchQuery?.trim() ?? '';
  const tokens = search.split(/\s+/).filter((t) => t.length > 2);

  const attempts: string[] = [];
  if (tokens.length > 1) attempts.push(tokens.slice(0, 2).join(' '));
  if (tokens.length > 0) attempts.push(tokens[0]);
  if (search.length >= 2) attempts.push(search);

  for (const term of attempts) {
    const query = await buildListedProductsQuery(supabase, { select: SELECT, search: term });
    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
    if (!error && data?.length) {
      return filterProductsWithValidImages(data as Product[]);
    }
  }

  if (input.brand && input.brand !== 'all') {
    let query = applyListedProductFilter(supabase.from('products').select(SELECT));
    query = query.ilike('brand', `%${input.brand}%`);
    const { data } = await query.order('created_at', { ascending: false }).limit(limit);
    if (data?.length) return filterProductsWithValidImages(data as Product[]);
  }

  if (input.category && input.category !== 'all') {
    const aliases = categoryDbValues(input.category);
    let query = applyListedProductFilter(supabase.from('products').select(SELECT));
    if (aliases.length === 1) query = query.eq('category', aliases[0]);
    else if (aliases.length > 1) query = query.in('category', aliases);
    const { data } = await query.order('created_at', { ascending: false }).limit(limit);
    if (data?.length) return filterProductsWithValidImages(data as Product[]);
  }

  const fallback = await buildListedProductsQuery(supabase, { select: SELECT });
  const { data } = await fallback.order('created_at', { ascending: false }).limit(limit);
  return filterProductsWithValidImages((data as Product[]) || []);
}

export function suggestRelaxedSearchTerms(searchQuery: string): string[] {
  const tokens = searchQuery.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return [];
  return [tokens.slice(0, -1).join(' '), tokens[0]].filter((t) => t.length >= 2);
}
