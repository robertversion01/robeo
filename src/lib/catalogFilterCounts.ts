import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import {
  categoryDbValues,
  subcategoryFilterDbValues,
} from '@/lib/catalogFilters';
import {
  applyCatalogFiltersToProductQuery,
  applyListedProductFilter,
} from '@/lib/listedProducts';
import { fetchAllVacationSellerIds } from '@/lib/vacationMode';

type CountMap = Record<string, number>;

function buildCategoryAliasOr(aliases: string[]) {
  if (aliases.length === 0) return null;
  return aliases
    .map((alias) => `category.ilike.%${alias.replace(/[%_\\]/g, '\\$&')}%`)
    .join(',');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CountQuery = any;

async function countWithFilters(
  supabase: SupabaseClient,
  filters: CatalogFilterState,
  exclude: 'category' | 'subcategory' | 'brand' | 'none',
  patch?: (query: CountQuery) => CountQuery,
) {
  const vacationIds = await fetchAllVacationSellerIds(supabase);
  let query = supabase.from('products').select('*', { count: 'exact', head: true });
  query = applyListedProductFilter(query);
  query = applyCatalogFiltersToProductQuery(query, filters, { exclude, vacationIds });
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
        const or = buildCategoryAliasOr(aliases);
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

/** Teljes találatszám az aktuális szűrőkre — ImmersiveFilterSheet előnézet. */
export async function fetchCatalogMatchCount(
  supabase: SupabaseClient,
  filters: CatalogFilterState,
): Promise<number> {
  return countWithFilters(supabase, filters, 'none');
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
        const or = buildCategoryAliasOr(aliases);
        return or ? q.or(or) : q;
      });
      return [id, count] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** RobeoBP — aktív hirdetések száma kerületenként. */
export async function fetchDistrictFilterCounts(
  supabase: SupabaseClient,
  filters: CatalogFilterState,
  districtIds: string[],
): Promise<CountMap> {
  const entries = await Promise.all(
    districtIds.map(async (id) => {
      const count = await countWithFilters(supabase, filters, 'none', (q) =>
        q.eq('budapest_district', id),
      );
      return [id, count] as const;
    }),
  );
  return Object.fromEntries(entries);
}
