'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { catalogUrlFromFilters } from '@/lib/catalogUrlParams';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { fetchListedProductTypeahead, type ProductTypeaheadRow } from '@/lib/listedProducts';
import { categoryDisplayLabel } from '@/lib/categoryDisplay';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (value: string) => void;
  catalogFilters?: CatalogFilterState;
  maxPriceLimit?: number;
  inputId?: string;
  className?: string;
  onSeeAll?: () => void;
  autoFocus?: boolean;
  browsePath?: string;
  /** Kompakt mobil feed fejléc — kisebb, szolidabb mező + Keresés gomb */
  compact?: boolean;
};

export default function SearchTypeahead({
  value,
  onChange,
  catalogFilters,
  maxPriceLimit = 0,
  inputId = 'catalog-search',
  className = '',
  onSeeAll,
  autoFocus = false,
  browsePath = '/browse',
  compact = false,
}: Props) {
  const { t } = useTranslation();
  const [liveResults, setLiveResults] = useState<ProductTypeaheadRow[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setLiveResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const results = await fetchListedProductTypeahead(supabase, query, 8);
      setLiveResults(results);
    }, 220);

    return () => clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const seeAllHref =
    catalogFilters != null
      ? `${catalogUrlFromFilters({ ...catalogFilters, search: value }, maxPriceLimit, browsePath)}#catalog`
      : `${browsePath}?q=${encodeURIComponent(value.trim())}#catalog`;

  const inputClass = compact
    ? 'h-9 w-full min-w-0 rounded-full border border-gray-200 bg-white pl-8 pr-2.5 text-xs text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#007782] focus:outline-none focus:ring-1 focus:ring-[#007782]'
    : 'h-11 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#007782] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#007782]';

  const searchField = (
    <div className={cn('relative min-w-0', compact ? 'flex-1' : 'w-full')}>
      <Search
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        size={compact ? 14 : 16}
      />
      <input
        id={inputId}
        name="search"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={t('browse.search.placeholder')}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        className={inputClass}
      />
      {open && value.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[10050] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {liveResults.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">{t('browse.search.noResults')}</div>
          ) : (
            <div className="max-h-56 overflow-y-auto overscroll-contain pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
              {liveResults.map((item) => {
                const catLabel = categoryDisplayLabel(t, item.category);
                return (
                  <Link
                    key={item.id}
                    href={`/products/${item.id}`}
                    onClick={() => setOpen(false)}
                    className="block border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-gray-50"
                  >
                    <p className="truncate text-xs font-medium text-gray-900">{item.name}</p>
                    <p className="truncate text-[11px] text-gray-500">
                      {[item.brand, catLabel].filter(Boolean).join(' · ') || catLabel}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
          <Link
            href={seeAllHref}
            onClick={() => {
              setOpen(false);
              onSeeAll?.();
            }}
            className="block border-t border-gray-100 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-[#007782] hover:bg-[#007782]/5"
          >
            {t('browse.search.seeAll', { query: value.trim() })}
          </Link>
        </div>
      ) : null}
    </div>
  );

  if (compact) {
    return (
      <div ref={containerRef} className={cn('flex items-center gap-2', className)}>
        {searchField}
        <Link
          href={seeAllHref}
          onClick={() => onSeeAll?.()}
          className="inline-flex h-9 shrink-0 items-center rounded-full bg-[#007782] px-3.5 text-xs font-semibold text-white shadow-sm touch-manipulation active:bg-[#006670]"
        >
          {t('nav.search')}
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {searchField}
    </div>
  );
}
