'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Bookmark, BookmarkCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';
import { buildSavedSearchFiltersFromProduct } from '@/lib/savedSearchFromProduct';
import {
  defaultSavedSearchLabel,
  loadSavedSearchesMerged,
  saveSearchEntry,
  type SavedSearch,
} from '@/lib/savedSearches';
import { isSavedSearchAlertEnabled, setSavedSearchAlertEnabled } from '@/lib/savedSearchAlerts';
import { listPriceWatches, upsertPriceWatch } from '@/lib/priceWatch';
import { syncPriceWatchesToServer } from '@/lib/priceWatchSync';

type Props = {
  product: Pick<Product, 'id' | 'name' | 'price' | 'category' | 'brand' | 'size' | 'condition' | 'color' | 'budapest_district'>;
  className?: string;
};

function filtersMatch(a: SavedSearch['filters'], b: SavedSearch['filters']): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function ProductAlertsBar({ product, className = '' }: Props) {
  const { t } = useTranslation();
  const [priceWatchOn, setPriceWatchOn] = useState(false);
  const [savedSearchId, setSavedSearchId] = useState<string | null>(null);
  const [searchAlertOn, setSearchAlertOn] = useState(false);
  const [busy, setBusy] = useState<'price' | 'search' | null>(null);

  const filters = useMemo(() => buildSavedSearchFiltersFromProduct(product), [product]);

  const refresh = useCallback(async () => {
    const watches = listPriceWatches();
    const w = watches.find((x) => x.productId === product.id);
    setPriceWatchOn(Boolean(w?.alertEnabled));

    const saved = await loadSavedSearchesMerged(supabase);
    const match = saved.find((s) => filtersMatch(s.filters, filters));
    if (match) {
      setSavedSearchId(match.id);
      setSearchAlertOn(isSavedSearchAlertEnabled(match.id));
    } else {
      setSavedSearchId(null);
      setSearchAlertOn(false);
    }
  }, [product.id, filters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const togglePriceWatch = async () => {
    setBusy('price');
    try {
      const next = !priceWatchOn;
      upsertPriceWatch({
        productId: product.id,
        productName: product.name,
        lastPrice: product.price,
        alertEnabled: next,
      });
      setPriceWatchOn(next);
      void syncPriceWatchesToServer(listPriceWatches());
      toast.success(next ? t('pdp.alerts.priceOn') : t('pdp.alerts.priceOff'));
    } finally {
      setBusy(null);
    }
  };

  const toggleSavedSearch = async () => {
    setBusy('search');
    try {
      if (savedSearchId) {
        const next = !searchAlertOn;
        setSavedSearchAlertEnabled(savedSearchId, next);
        setSearchAlertOn(next);
        toast.success(next ? t('pdp.alerts.searchOn') : t('pdp.alerts.searchOff'));
        return;
      }

      const entry = await saveSearchEntry(
        supabase,
        defaultSavedSearchLabel(filters, t),
        filters,
      );
      setSavedSearchAlertEnabled(entry.id, true);
      setSavedSearchId(entry.id);
      setSearchAlertOn(true);
      toast.success(t('pdp.alerts.searchSaved'));
    } catch {
      toast.error(t('pdp.alerts.error'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`rounded-xl border border-[#007782]/15 bg-[#007782]/5 px-3 py-2.5 ${className}`}>
      <p className="text-xs font-semibold text-gray-800">{t('pdp.alerts.title')}</p>
      <p className="mt-0.5 text-[11px] text-gray-600 leading-snug">{t('pdp.alerts.subtitle')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy === 'price'}
          onClick={() => void togglePriceWatch()}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            priceWatchOn
              ? 'border-[#007782] bg-[#007782]/10 text-[#007782]'
              : 'border-gray-200 bg-white text-gray-600 hover:border-[#007782]/30'
          }`}
        >
          {priceWatchOn ? <Bell size={13} /> : <BellOff size={13} />}
          {priceWatchOn ? t('pdp.alerts.priceWatching') : t('pdp.alerts.priceWatch')}
        </button>
        <button
          type="button"
          disabled={busy === 'search'}
          onClick={() => void toggleSavedSearch()}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            savedSearchId && searchAlertOn
              ? 'border-[#007782] bg-[#007782]/10 text-[#007782]'
              : 'border-gray-200 bg-white text-gray-600 hover:border-[#007782]/30'
          }`}
        >
          {savedSearchId ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          {savedSearchId
            ? searchAlertOn
              ? t('pdp.alerts.searchWatching')
              : t('pdp.alerts.searchSavedMuted')
            : t('pdp.alerts.saveSimilarSearch')}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-gray-500">
        {t('pdp.alerts.digestHint')}{' '}
        <Link href="/profile?tab=settings" className="font-semibold text-[#007782] hover:underline">
          {t('pdp.alerts.digestLink')}
        </Link>
      </p>
    </div>
  );
}
