'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Bookmark, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import {
  defaultSavedSearchLabel,
  loadSavedSearchesMerged,
  removeSavedSearchEntry,
  saveSearchEntry,
  type SavedSearch,
} from '@/lib/savedSearches';
import {
  isSavedSearchAlertEnabled,
  setSavedSearchAlertEnabled as persistSavedSearchAlert,
} from '@/lib/savedSearchAlerts';
import {
  clearSavedSearchNewBadge,
  getSavedSearchNewCount,
} from '@/lib/savedSearchMatcher';

type Props = {
  filters: CatalogFilterState;
  onApply: (filters: SavedSearch['filters']) => void;
  hasActiveFilters: boolean;
};

export default function SavedSearchesStrip({ filters, onApply, hasActiveFilters }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [alertRevision, setAlertRevision] = useState(0);
  const enabledAlertCount = items.filter((item) => isSavedSearchAlertEnabled(item.id)).length;

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
        listingType: filters.listingType ?? 'all',
        category: filters.category,
        subcategory: filters.subcategory,
        brand: filters.brand,
        size: filters.size,
        condition: filters.condition,
        color: filters.color,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sort: filters.sort,
        search: filters.search,
        budapest_district: filters.budapest_district ?? 'all',
      };
      await saveSearchEntry(
        supabase,
        defaultSavedSearchLabel(payload, t),
        payload,
      );
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  const handleRemove = async (item: SavedSearch) => {
    if (!window.confirm(t('browse.saved.removeConfirm', { label: item.label }))) return;

    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      const next = await removeSavedSearchEntry(supabase, item.id);
      setItems(next);
    } catch (err) {
      console.error('[SavedSearchesStrip] remove failed:', err);
      toast.error(t('browse.saved.removeFailed'));
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  };

  if (items.length === 0 && !hasActiveFilters) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8fa3ad]">
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
        <p className="text-[11px] text-[#8fa3ad]">
          {t('browse.saved.summary', { total: items.length, alerts: enabledAlertCount })}
        </p>
      ) : null}
      {items.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {items.map((item) => (
            <div
              key={`${item.id}-${alertRevision}`}
              className="group inline-flex shrink-0 items-center gap-1 rounded-full border border-[#2a3941] bg-[#1a2328] pl-3 pr-1 py-1"
            >
              <button
                type="button"
                onClick={() => {
                  clearSavedSearchNewBadge(item.id);
                  setAlertRevision((n) => n + 1);
                  onApply(item.filters);
                }}
                className="relative max-w-[10rem] truncate text-xs font-medium text-[#e7edf0] hover:text-[#007782] pr-1"
                title={item.label}
              >
                {item.label}
                {getSavedSearchNewCount(item.id) > 0 ? (
                  <span className="absolute -top-1.5 -right-1 min-w-[16px] h-4 rounded-full bg-[#007782] text-white text-[9px] font-bold flex items-center justify-center px-1">
                    {getSavedSearchNewCount(item.id)}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => {
                  persistSavedSearchAlert(
                    item.id,
                    !isSavedSearchAlertEnabled(item.id),
                  );
                  setAlertRevision((n) => n + 1);
                }}
                className="rounded-full p-1 text-[#007782] hover:bg-[#007782]/10"
                aria-label={t('browse.saved.alertToggle')}
                title={
                  isSavedSearchAlertEnabled(item.id)
                    ? t('browse.saved.alertOn')
                    : t('browse.saved.alertOff')
                }
              >
                {isSavedSearchAlertEnabled(item.id) ? (
                  <Bell size={12} />
                ) : (
                  <BellOff size={12} className="text-[#6b7d85]" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleRemove(item)}
                className="rounded-full p-1.5 text-[#6b7d85] hover:bg-red-950/40 hover:text-red-600"
                aria-label={t('browse.saved.remove')}
                title={t('browse.saved.remove')}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs text-[#8fa3ad]">{t('browse.saved.emptyHint')}</p>
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <Link href="/favorites" className="font-semibold text-[#007782] hover:underline">
              {t('browse.saved.openWatchlist')}
            </Link>
            <Link href="/profile?tab=settings" className="font-semibold text-[#007782] hover:underline">
              {t('browse.saved.openAlerts')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
