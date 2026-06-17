'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Bookmark, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { loadSavedSearchesMerged } from '@/lib/savedSearches';
import { countEnabledAlerts } from '@/lib/savedSearchAlerts';
import { listPriceWatches } from '@/lib/priceWatch';

export default function WatchlistSummaryStrip() {
  const { t } = useTranslation();
  const [priceWatchCount, setPriceWatchCount] = useState(0);
  const [searchAlertCount, setSearchAlertCount] = useState(0);

  useEffect(() => {
    void (async () => {
      const watches = listPriceWatches().filter((w) => w.alertEnabled);
      setPriceWatchCount(watches.length);
      const saved = await loadSavedSearchesMerged(supabase);
      setSearchAlertCount(countEnabledAlerts(saved));
    })();
  }, []);

  if (priceWatchCount === 0 && searchAlertCount === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-[#2a3941] bg-[#141d21]/80 px-3 py-2.5">
      <p className="text-xs font-semibold text-[#e7edf0]">{t('watchlist.summaryTitle')}</p>
      <ul className="mt-2 space-y-1.5 text-[11px] text-[#8fa3ad]">
        {priceWatchCount > 0 ? (
          <li className="flex items-center gap-1.5">
            <Bell size={12} className="shrink-0 text-[#007782]" />
            {t('watchlist.priceWatchCount', { count: priceWatchCount })}
          </li>
        ) : null}
        {searchAlertCount > 0 ? (
          <li className="flex items-center gap-1.5">
            <Bookmark size={12} className="shrink-0 text-[#007782]" />
            {t('watchlist.searchAlertCount', { count: searchAlertCount })}
          </li>
        ) : null}
      </ul>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <Link href="/browse" className="font-semibold text-[#007782] hover:underline">
          {t('watchlist.browseSaved')}
        </Link>
        <span className="inline-flex items-center gap-1 text-[#8fa3ad]">
          <Mail size={10} />
          <Link href="/profile?tab=settings" className="font-semibold text-[#007782] hover:underline">
            {t('watchlist.digestSettings')}
          </Link>
        </span>
      </p>
    </div>
  );
}
