'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { fetchZeroResultsRescueProducts, suggestRelaxedSearchTerms } from '@/lib/zeroResultsRescue';
import PresetImage from '@/components/product/PresetImage';
import { formatPrice } from '@/lib/utils';
import { normalizePrimaryProductImageUrl } from '@/lib/productImageValidation';
import type { Product } from '@/types';

type Props = {
  searchQuery?: string;
  category?: string;
  brand?: string;
  onApplySearch?: (query: string) => void;
  onClearFilters?: () => void;
};

export default function ZeroResultsRescue({
  searchQuery = '',
  category,
  brand,
  onApplySearch,
  onClearFilters,
}: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const suggestions = suggestRelaxedSearchTerms(searchQuery);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchZeroResultsRescueProducts(supabase, {
      searchQuery,
      category,
      brand,
      limit: 8,
    }).then((rows) => {
      if (!cancelled) {
        setItems(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [searchQuery, category, brand]);

  if (loading) {
    return (
      <div className="mt-4 h-24 animate-pulse rounded-xl bg-[#141d21]" aria-hidden />
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-[#2a3941] bg-[#141d21] p-3">
      <h3 className="text-sm font-semibold text-[#e7edf0]">{t('browse.empty.rescueTitle')}</h3>
      <p className="mt-1 text-xs text-[#8fa3ad]">{t('browse.empty.rescueHint')}</p>

      {suggestions.length > 0 ? (
        <div className="mt-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8fa3ad]">
            {t('browse.empty.rescueTryLabel')}
          </p>
          <div className="flex flex-wrap gap-1.5">
          {suggestions.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => onApplySearch?.(term)}
              className="rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-[11px] font-semibold text-[#b2c0c6] hover:border-[#38c7d0]/35 hover:text-[#38c7d0]"
            >
              {term}
            </button>
          ))}
          {onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-[11px] font-semibold text-[#38c7d0]"
            >
              {t('browse.empty.clearFilters')}
            </button>
          ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8fa3ad]">
        {t('browse.empty.rescueRailLabel')}
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {items.map((p) => {
          const img = normalizePrimaryProductImageUrl(p);
          return (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="w-[88px] shrink-0 rounded-lg border border-[#2a3941] bg-[#121b20] overflow-hidden hover:border-[#38c7d0]/35"
            >
              <div className="aspect-[4/5] bg-[#0f1a1d]">
                {img ? (
                  <PresetImage url={img} preset="railCard" alt={p.name} className="h-full w-full object-contain" />
                ) : null}
              </div>
              <p className="truncate px-1.5 py-1 text-[10px] font-bold text-[#007782]">
                {formatPrice(p.price)}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
