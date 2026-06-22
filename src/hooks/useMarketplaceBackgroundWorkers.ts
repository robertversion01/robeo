'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { loadSavedSearchesMerged } from '@/lib/savedSearches';
import { runSavedSearchAlertScan } from '@/lib/savedSearchNotify';
import { listPriceWatches, detectPriceDrops } from '@/lib/priceWatch';
import { notifyPriceDropsIfEnabled } from '@/lib/priceWatchNotify';
import { recordPriceSnapshot } from '@/lib/priceHistory';
import type { Product } from '@/types';

const SAVED_SEARCH_INTERVAL_MS = 12 * 60 * 1000;
const PRICE_WATCH_INTERVAL_MS = 8 * 60 * 1000;
/** Első scan késleltetése — ne versenyezzen a feed LCP-vel. */
const INITIAL_SCAN_DELAY_MS = 8_000;

type Options = {
  products?: Product[];
  enabled?: boolean;
};

/**
 * Háttér worker: mentett keresés + árfigyelő periodikus scan (app nyitva).
 * Szerver cron: POST /api/workers/saved-search-scan CRON_SECRET-tel.
 * Kliens csak lokális scan — admin API hívás nélkül (dev barát, kevesebb zaj).
 */
export function useMarketplaceBackgroundWorkers({ products = [], enabled = true }: Options) {
  const productsRef = useRef(products);
  productsRef.current = products;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const runSavedSearch = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const saved = await loadSavedSearchesMerged(supabase);
      if (saved.length === 0) return;

      const list = productsRef.current;
      if (list.length > 0) {
        await runSavedSearchAlertScan(supabase, user.id, saved, list);
      }
    };

    const runPriceWatch = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const watches = listPriceWatches().filter((w) => w.alertEnabled);
      if (watches.length === 0) return;

      const list = productsRef.current;
      const priced = list
        .filter((p) => watches.some((w) => w.productId === p.id))
        .map((p) => ({ id: p.id, name: p.name, price: p.price }));

      for (const p of priced) {
        await recordPriceSnapshot(supabase, p.id, p.price);
      }

      const hits = detectPriceDrops(priced);
      if (hits.length > 0) {
        await notifyPriceDropsIfEnabled(supabase, user.id, hits);
      }
    };

    const initialTimer = window.setTimeout(() => {
      if (!cancelled) {
        void runSavedSearch();
        void runPriceWatch();
      }
    }, INITIAL_SCAN_DELAY_MS);

    const t1 = window.setInterval(runSavedSearch, SAVED_SEARCH_INTERVAL_MS);
    const t2 = window.setInterval(runPriceWatch, PRICE_WATCH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(t1);
      window.clearInterval(t2);
    };
  }, [enabled]);
}
