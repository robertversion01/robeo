'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useImmersiveBrowse } from '@/context/ImmersiveBrowseContext';
import Filters from '@/components/product/Filters';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { supabase } from '@/lib/supabase';
import { fetchCatalogMatchCount } from '@/lib/catalogFilterCounts';

export type ImmersiveFiltersMeta = {
  categories: { id: string; label: string }[];
  sortOptions: { id: string; label: string }[];
  maxPriceLimit: number;
};

type Props = {
  catalogFilters: CatalogFilterState;
  filtersMeta: ImmersiveFiltersMeta;
  activeFilterCount?: number;
  onApplyFilters: (filters: CatalogFilterState) => void;
  onApply: () => void;
};

function countActiveCatalogFilters(filters: CatalogFilterState, maxPriceLimit: number) {
  let n = 0;
  if (filters.category !== 'all') n++;
  if (filters.subcategory !== 'all') n++;
  if (filters.brand !== 'all') n++;
  if (filters.size !== 'all') n++;
  if (filters.condition !== 'all') n++;
  if (filters.color !== 'all') n++;
  if (filters.minPrice > 0) n++;
  if (filters.maxPrice > 0 && filters.maxPrice < maxPriceLimit) n++; 
  return n;
}

export default function ImmersiveFilterSheet({
  catalogFilters,
  filtersMeta,
  activeFilterCount: _activeFilterCount = 0,
  onApplyFilters,
  onApply,
}: Props) {
  const { t } = useTranslation();
  const { filterSheetOpen, closeFilterSheet } = useImmersiveBrowse();
  const { categories, sortOptions, maxPriceLimit } = filtersMeta;

  const [draft, setDraft] = useState<CatalogFilterState>(catalogFilters);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const countGenRef = useRef(0);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (filterSheetOpen && !wasOpenRef.current) {
      setDraft(catalogFilters);
      setMatchCount(null);
      setCounting(false);
    }
    wasOpenRef.current = filterSheetOpen;
  }, [filterSheetOpen, catalogFilters]);

  useEffect(() => {
    if (!filterSheetOpen) return;
    const generation = ++countGenRef.current;
    setCounting(true);
    const timer = window.setTimeout(() => {
      void fetchCatalogMatchCount(supabase, draft).then((count) => {
        if (generation !== countGenRef.current) return;
        setMatchCount(count);
        setCounting(false);
      });
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [draft, filterSheetOpen]);

  const draftActiveFilterCount = useMemo(
    () => countActiveCatalogFilters(draft, maxPriceLimit),
    [draft, maxPriceLimit],
  );

  const searchActive = draft.search.trim().length > 0;
  const sortActive = draft.sort !== 'newest';
  const totalActive = draftActiveFilterCount + (searchActive ? 1 : 0) + (sortActive ? 1 : 0);

  const patchDraft = useCallback((patch: Partial<CatalogFilterState>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearDraftFilters = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      category: 'all',
      subcategory: 'all',
      brand: 'all',
      size: 'all',
      condition: 'all',
      color: 'all',
      minPrice: 0,
      maxPrice: maxPriceLimit,
      sort: 'newest',
    }));
  }, [maxPriceLimit]);

  useEffect(() => {
    if (!filterSheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filterSheetOpen]);

  const applyLabel = counting
    ? t('browse.immersive.counting')
    : matchCount !== null
      ? t('browse.immersive.applyWithCount', { count: matchCount })
      : t('browse.immersive.applyFilters');

  if (!filterSheetOpen) return null;

  return (
    <div className="fixed inset-0 z-[9985] md:hidden" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label={t('common.close')}
        onClick={closeFilterSheet}
      />
      <div className="absolute bottom-0 left-0 right-0 max-h-[88dvh] rounded-t-2xl bg-white shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex justify-center pt-2 pb-1 shrink-0" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">{t('browse.immersive.filterSheetTitle')}</h2>
            {totalActive > 0 ? (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {t('browse.immersive.activeFilters', { count: totalActive })}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={closeFilterSheet} className="p-2 rounded-full hover:bg-gray-100 min-h-11 min-w-11">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
                    <Filters
            categories={categories}
            selectedCategory={draft.category}
            onCategoryChange={(id) =>
              setDraft((prev) => ({
                ...prev,
                category: id,
                subcategory: 'all',
              }))
            }
            selectedSubcategory={draft.subcategory}
            onSubcategoryChange={(id) => patchDraft({ subcategory: id })}
            selectedBrand={draft.brand}
            onBrandChange={(id) => patchDraft({ brand: id })}
            selectedSize={draft.size}
            onSizeChange={(id) => patchDraft({ size: id })}
            selectedCondition={draft.condition}
            onConditionChange={(id) => patchDraft({ condition: id })}
            selectedColor={draft.color}
            onColorChange={(id) => patchDraft({ color: id })}
            selectedMinPrice={draft.minPrice}
            selectedMaxPrice={draft.maxPrice}
            maxPriceLimit={maxPriceLimit}
            onMinPriceChange={(value) => patchDraft({ minPrice: value })}
            onMaxPriceChange={(value) => patchDraft({ maxPrice: value })}
            sortOptions={sortOptions}
            selectedSort={draft.sort}
            onSortChange={(id) => patchDraft({ sort: id })}
            activeFilterCount={draftActiveFilterCount}
            onClearAll={clearDraftFilters}
          />
        </div>
        <div className="shrink-0 border-t border-gray-200 p-4">
          <button
            type="button"
            disabled={counting}
            onClick={() => {
              onApplyFilters(draft);
              onApply();
              closeFilterSheet();
            }}
            className="w-full btn-base btn-primary min-h-12"
          >
            {applyLabel}          </button>
        </div>
      </div>
    </div>
  );
}
