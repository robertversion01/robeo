'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { buildCatalogUrlParams, parseCatalogFromUrl } from '@/lib/catalogUrlParams';

type CatalogUrlSyncArgs = {
  filters: CatalogFilterState;
  maxPriceLimit: number;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (id: string) => void;
  setSelectedBrand: (id: string) => void;
  setSelectedSize: (id: string) => void;
  setSelectedCondition: (id: string) => void;
  setSelectedMinPrice: (n: number) => void;
  setSelectedMaxPrice: (n: number) => void;
  setSelectedSort: (id: string) => void;
};

export function useCatalogUrlSync({
  filters,
  maxPriceLimit,
  setSearchQuery,
  setSelectedCategory,
  setSelectedBrand,
  setSelectedSize,
  setSelectedCondition,
  setSelectedMinPrice,
  setSelectedMaxPrice,
  setSelectedSort,
}: CatalogUrlSyncArgs) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydratedRef = useRef(false);
  const skipWriteRef = useRef(false);

  useEffect(() => {
    if (pathname !== '/') return;
    if (hydratedRef.current) return;

    const parsed = parseCatalogFromUrl(searchParams);
    if (Object.keys(parsed).length === 0) {
      hydratedRef.current = true;
      return;
    }

    skipWriteRef.current = true;
    if (parsed.search != null) setSearchQuery(parsed.search);
    if (parsed.category) setSelectedCategory(parsed.category);
    if (parsed.brand) setSelectedBrand(parsed.brand);
    if (parsed.size) setSelectedSize(parsed.size);
    if (parsed.condition) setSelectedCondition(parsed.condition);
    if (parsed.minPrice != null) setSelectedMinPrice(parsed.minPrice);
    if (parsed.maxPrice != null && parsed.maxPrice > 0) setSelectedMaxPrice(parsed.maxPrice);
    if (parsed.sort) setSelectedSort(parsed.sort);

    hydratedRef.current = true;
    requestAnimationFrame(() => {
      skipWriteRef.current = false;
    });
  }, [
    pathname,
    searchParams,
    setSearchQuery,
    setSelectedCategory,
    setSelectedBrand,
    setSelectedSize,
    setSelectedCondition,
    setSelectedMinPrice,
    setSelectedMaxPrice,
    setSelectedSort,
  ]);

  useEffect(() => {
    if (pathname !== '/') return;
    if (!hydratedRef.current) return;
    if (skipWriteRef.current) return;

    const params = buildCatalogUrlParams(filters, maxPriceLimit);
    const next = params.toString();
    const current = searchParams.toString();

    if (next === current) return;

    const url = next ? `${pathname}?${next}` : pathname;
    router.replace(url, { scroll: false });
  }, [filters, maxPriceLimit, pathname, router, searchParams]);
}
