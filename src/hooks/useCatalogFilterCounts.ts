'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { serializeCatalogFilters } from '@/lib/catalogFilters';
import { isMobileViewport } from '@/lib/mobilePerf';
import {
  fetchBrandFilterCounts,
  fetchCategoryFilterCounts,
  fetchSubcategoryFilterCounts,
} from '@/lib/catalogFilterCounts';

type FilterCounts = {
  categories: Record<string, number>;
  subcategories: Record<string, number>;
  brands: Record<string, number>;
};

const EMPTY: FilterCounts = { categories: {}, subcategories: {}, brands: {} };

export function useCatalogFilterCounts(
  filters: CatalogFilterState,
  categoryIds: string[],
  subcategoryIds: string[],
  brandNames: string[],
) {
  const [counts, setCounts] = useState<FilterCounts>(EMPTY);
  const filterKey = serializeCatalogFilters(filters);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [categories, subcategories, brands] = await Promise.all([
          categoryIds.length > 0
            ? fetchCategoryFilterCounts(supabase, filters, categoryIds)
            : Promise.resolve({}),
          subcategoryIds.length > 0
            ? fetchSubcategoryFilterCounts(supabase, filters, subcategoryIds)
            : Promise.resolve({}),
          brandNames.length > 0
            ? fetchBrandFilterCounts(supabase, filters, brandNames)
            : Promise.resolve({}),
        ]);
        if (!cancelled) {
          setCounts({ categories, subcategories, brands });
        }
      } catch {
        if (!cancelled) setCounts(EMPTY);
      }
    };

    const delay = isMobileViewport() ? 900 : 280;
    const timer = window.setTimeout(() => {
      void load();
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filterKey, categoryIds.join(','), subcategoryIds.join(','), brandNames.join(',')]);

  return counts;
}
