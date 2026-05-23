'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { catalogUrlFromFilters } from '@/lib/catalogUrlParams';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { fetchListedProductTypeahead, type ProductTypeaheadRow } from '@/lib/listedProducts';

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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
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
        className="h-11 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#007782] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#007782]"
      />
      {open && value.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[10050] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {liveResults.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-gray-500">{t('browse.search.noResults')}</div>
          ) : (
            <div className="max-h-60 overflow-y-auto overscroll-contain pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
              {liveResults.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  onClick={() => setOpen(false)}
                  className="block border-b border-gray-100 px-3 py-2.5 last:border-b-0 hover:bg-gray-50"
                >
                  <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {[item.brand, item.category].filter(Boolean).join(' · ') || item.category}
                  </p>
                </Link>
              ))}
            </div>
          )}
          <Link
            href={seeAllHref}
            onClick={() => {
              setOpen(false);
              onSeeAll?.();
            }}
            className="block border-t border-gray-100 bg-gray-50 px-3 py-2.5 text-center text-xs font-semibold text-[#007782] hover:bg-[#007782]/5"
          >
            {t('browse.search.seeAll', { query: value.trim() })}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
