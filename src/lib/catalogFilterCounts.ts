import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import {
  categoryDbValues,
  conditionDbValues,
  subcategoryFilterDbValues,
} from '@/lib/catalogFilters';
import { fetchAllVacationSellerIds } from '@/lib/vacationMode';

type CountMap = Record<string, number>;

type ExcludeDimension = 'category' | 'subcategory' | 'brand';

function buildAliasOr(column: string, aliases: string[]) {
  if (aliases.length === 0) return null;
  return aliases.map((alias) => `${column}.ilike.%${alias.replace(/[%_\\]/g, '\\$&')}%`).join(',');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CountQuery = any;

async function applySharedFilters(
  supabase: SupabaseClient,
  filters: CatalogFilterState,
  exclude: ExcludeDimension,
): Promise<CountQuery> {
  let query = supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .or('status.eq.active,status.is.null');

  if (exclude !== 'brand' && filters.brand !== 'all') {
    query = query.ilike('brand', filters.brand);
  }

  const searchTerm = filters.search.trim();
  if (searchTerm) {
    const escaped = searchTerm.replace(/[%_\\]/g, '\\$&');
    query = query.or(
      `name.ilike.%${escaped}%,description.ilike.%${escaped}%,brand.ilike.%${escaped}%`,
    );
  }

  if (filters.condition !== 'all') {
    const condValues = conditionDbValues(filters.condition);
    if (condValues.length === 1) {
      query = query.eq('condition', condValues[0]);
    } else if (condValues.length > 1) {
      query = query.in('condition', condValues);
    }
  }

  if (filters.color !== 'all') {
    query = query.ilike('color', `%${filters.color}%`);
  }

  if (filters.size !== 'all') {
    query = query.ilike('size', `%${filters.size}%`);
  }

  if (filters.minPrice > 0) {
    query = query.gte('price', filters.minPrice);
  }

  if (filters.maxPrice > 0) {
    query = query.lte('price', filters.maxPrice);
  }

  if (exclude !== 'category' && filters.category !== 'all') {
    const or = buildAliasOr('category', categoryDbValues(filters.category));
    if (or) query = query.or(or);
  }

  if (exclude !== 'subcategory' && filters.subcategory !== 'all') {
    const or = buildAliasOr('category', subcategoryFilterDbValues(filters.subcategory));
    if (or) query = query.or(or);
  }

  const vacationIds = await fetchAllVacationSellerIds(supabase);
  if (vacationIds.length > 0) {
    query = query.not('user_id', 'in', `(${vacationIds.join(',')})`);
  }

  return query;
}

async function countWithFilters(
  supabase: SupabaseClient,
  filters: CatalogFilterState,
  exclude: ExcludeDimension,
  patch?: (query: CountQuery) => CountQuery,
) {
  let query = await applySharedFilters(supabase, filters, exclude);
  if (patch) query = patch(query);
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function fetchCategoryFilterCounts(
  supabase: SupabaseClient,
  filters: CatalogFilterState,
  categoryIds: string[],
): Promise<CountMap> {
  const entries = await Promise.all(
    categoryIds.map(async (id) => {
      if (id === 'all') {
        const count = await countWithFilters(supabase, filters, 'category');
        return [id, count] as const;
      }
      const aliases = categoryDbValues(id);
      const count = await countWithFilters(supabase, filters, 'category', (q) => {
        const or = buildAliasOr('category', aliases);
        return or ? q.or(or) : q;
      });
      return [id, count] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function fetchBrandFilterCounts(
  supabase: SupabaseClient,
  filters: CatalogFilterState,
  brands: string[],
): Promise<CountMap> {
  const entries = await Promise.all(
    brands.map(async (brand) => {
      const count = await countWithFilters(supabase, filters, 'brand', (q) =>
        q.ilike('brand', brand),
      );
      return [brand, count] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function fetchSubcategoryFilterCounts(
  supabase: SupabaseClient,
  filters: CatalogFilterState,
  subcategoryIds: string[],
): Promise<CountMap> {
  const entries = await Promise.all(
    subcategoryIds.map(async (id) => {
      if (id === 'all') {
        const count = await countWithFilters(supabase, filters, 'subcategory');
        return [id, count] as const;
      }
      const aliases = subcategoryFilterDbValues(id);
      const count = await countWithFilters(supabase, filters, 'subcategory', (q) => {
        const or = buildAliasOr('category', aliases);
        return or ? q.or(or) : q;
      });
      return [id, count] as const;
    }),
  );
  return Object.fromEntries(entries);
}
