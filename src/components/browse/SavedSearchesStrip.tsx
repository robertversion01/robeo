'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bookmark, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import {
  defaultSavedSearchLabel,
  loadSavedSearchesMerged,
  removeSavedSearchEntry,
  saveSearchEntry,
  type SavedSearch,
} from '@/lib/savedSearches';

type Props = {
  filters: CatalogFilterState;
  onApply: (filters: SavedSearch['filters']) => void;
  hasActiveFilters: boolean;
};

export default function SavedSearchesStrip({ filters, onApply, hasActiveFilters }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const merged = await loadSavedSearchesMerged(supabase);
    setItems(merged);
  }, []);

  useEffect(() => {
    void refresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const handleSave = async () => {
    setSyncing(true);
    try {
      const payload = {
        category: filters.category,
        brand: filters.brand,
        size: filters.size,
        condition: filters.condition,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sort: filters.sort,
        search: filters.search,
      };
      await saveSearchEntry(
        supabase,
        defaultSavedSearchLabel(payload),
        payload,
      );
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  if (items.length === 0 && !hasActiveFilters) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t('browse.saved.title')}
        </p>
        {hasActiveFilters ? (
          <button
            type="button"
            disabled={syncing}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1 rounded-full border border-[#007782]/30 bg-[#007782]/5 px-2.5 py-1 text-[11px] font-semibold text-[#007782] hover:bg-[#007782]/10 disabled:opacity-60"
          >
            <Bookmark size={12} />
            {syncing ? t('browse.saved.syncing') : t('browse.saved.saveCurrent')}
          </button>
        ) : null}
      </div>
      {items.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {items.map((item) => (
            <div
              key={item.id}
              className="group inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-white pl-3 pr-1 py-1"
            >
              <button
                type="button"
                onClick={() => onApply(item.filters)}
                className="max-w-[10rem] truncate text-xs font-medium text-gray-800 hover:text-[#007782]"
                title={item.label}
              >
                {item.label}
              </button>
              <button
                type="button"
                onClick={() => {
                  void removeSavedSearchEntry(supabase, item.id).then(refresh);
                }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label={t('browse.saved.remove')}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">{t('browse.saved.emptyHint')}</p>
      )}
    </div>
  );
}
