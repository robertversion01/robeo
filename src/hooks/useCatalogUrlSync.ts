'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { buildCatalogUrlParams, parseCatalogFromUrl } from '@/lib/catalogUrlParams';

const CATALOG_PATHS = new Set(['/', '/browse']);
const URL_SYNC_DEBOUNCE_MS = 320;

type CatalogUrlSyncArgs = {
  browsePath?: string;
  filters: CatalogFilterState;
  maxPriceLimit: number;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (id: string) => void;
  setSelectedSubcategory: (id: string) => void;
  setSelectedBrand: (id: string) => void;
  setSelectedSize: (id: string) => void;
  setSelectedCondition: (id: string) => void;
  setSelectedColor: (id: string) => void;
  setSelectedMinPrice: (n: number) => void;
  setSelectedMaxPrice: (n: number) => void;
  setSelectedSort: (id: string) => void;
  /** RobeoBP only — opcionális, V1 módban nem kell beadni. */
  setSelectedDistrict?: (id: string) => void;
};

export function useCatalogUrlSync({
  browsePath,
  filters,
  maxPriceLimit,
  setSearchQuery,
  setSelectedCategory,
  setSelectedSubcategory,
  setSelectedBrand,
  setSelectedSize,
  setSelectedCondition,
  setSelectedColor,
  setSelectedMinPrice,
  setSelectedMaxPrice,
  setSelectedSort,
  setSelectedDistrict,
}: CatalogUrlSyncArgs) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydratedRef = useRef(false);
  const skipWriteRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const activePath = browsePath ?? pathname;
  const syncEnabled = CATALOG_PATHS.has(pathname) && activePath === pathname;

  useEffect(() => {
    if (!syncEnabled) return;
    if (hydratedRef.current) return;

    const parsed = parseCatalogFromUrl(searchParams);
    if (Object.keys(parsed).length === 0) {
      hydratedRef.current = true;
      return;
    }

    skipWriteRef.current = true;
    if (parsed.search != null) setSearchQuery(parsed.search);
    if (parsed.category) setSelectedCategory(parsed.category);
    if (parsed.subcategory) setSelectedSubcategory(parsed.subcategory);
    if (parsed.brand) setSelectedBrand(parsed.brand);
    if (parsed.size) setSelectedSize(parsed.size);
    if (parsed.condition) setSelectedCondition(parsed.condition);
    if (parsed.color) setSelectedColor(parsed.color);
    if (parsed.minPrice != null) setSelectedMinPrice(parsed.minPrice);
    if (parsed.maxPrice != null && parsed.maxPrice > 0) setSelectedMaxPrice(parsed.maxPrice);
    if (parsed.sort) setSelectedSort(parsed.sort);
    if (parsed.budapest_district && setSelectedDistrict) {
      setSelectedDistrict(parsed.budapest_district);
    }

    hydratedRef.current = true;
    requestAnimationFrame(() => {
      skipWriteRef.current = false;
    });
  }, [
    syncEnabled,
    searchParams,
    setSearchQuery,
    setSelectedCategory,
    setSelectedSubcategory,
    setSelectedBrand,
    setSelectedSize,
    setSelectedCondition,
    setSelectedColor,
    setSelectedMinPrice,
    setSelectedMaxPrice,
    setSelectedSort,
    setSelectedDistrict,
  ]);

  useEffect(() => {
    if (!syncEnabled) return;
    if (!hydratedRef.current) return;
    if (skipWriteRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const params = buildCatalogUrlParams(filtersRef.current, maxPriceLimit);
      const next = params.toString();
      const current = searchParams.toString();

      if (next === current) return;

      const url = next ? `${activePath}?${next}` : activePath;
      router.replace(url, { scroll: false });
    }, URL_SYNC_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, maxPriceLimit, activePath, router, searchParams, syncEnabled]);
}
