import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import type { SavedSearch } from '@/lib/savedSearches';
import { findNewSavedSearchMatches } from '@/lib/savedSearchMatchCore';
import { isSavedSearchAlertEnabled } from '@/lib/savedSearchAlerts';
import {
  loadSavedSearchWorkerState,
  loadSavedSearchWorkerStateForUser,
  mergeSeenIds,
  persistSavedSearchWorkerState,
  persistSavedSearchWorkerStateForUser,
} from '@/lib/savedSearchWorkerState';
import { routeMarketplaceNotification } from '@/lib/notificationChannels';
import { requestNotificationFlush } from '@/lib/notificationFlushClient';
import {
  loadServerNotificationDedupe,
  markServerNotificationDedupe,
  wasRecentlyNotified,
} from '@/lib/notificationDedupe';

const NOTIFY_DEDUPE_KEY = 'robeo_saved_search_notify_dedupe_v1';

function readDedupe(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(NOTIFY_DEDUPE_KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writeDedupe(map: Record<string, number>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIFY_DEDUPE_KEY, JSON.stringify(map));
}

export type SavedSearchScanResult = {
  notified: number;
  searchesChecked: number;
  outboundQueued: number;
};

async function resolveWorkerState(supabase: SupabaseClient, userId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) {
    return { state: await loadSavedSearchWorkerState(supabase), useAdmin: false };
  }
  const adminState = await loadSavedSearchWorkerStateForUser(supabase, userId);
  return { state: adminState, useAdmin: true };
}

async function persistWorkerState(
  supabase: SupabaseClient,
  userId: string,
  state: Awaited<ReturnType<typeof loadSavedSearchWorkerState>>,
  useAdmin: boolean,
) {
  if (useAdmin) {
    await persistSavedSearchWorkerStateForUser(supabase, userId, state);
  } else {
    await persistSavedSearchWorkerState(supabase, state);
  }
}

/**
 * Új találatok → in-app értesítés + worker state frissítés.
 * Kliens és API worker közös logika.
 */
export async function runSavedSearchAlertScan(
  supabase: SupabaseClient,
  userId: string,
  saved: SavedSearch[],
  products: Array<
    Pick<
      Product,
      | 'id'
      | 'name'
      | 'description'
      | 'brand'
      | 'category'
      | 'size'
      | 'condition'
      | 'price'
      | 'budapest_district'
    >
  >,
  userEmail?: string | null,
): Promise<SavedSearchScanResult> {
  let notified = 0;
  let outboundQueued = 0;
  const { state: workerState, useAdmin } = await resolveWorkerState(supabase, userId);
  const isServer = typeof window === 'undefined';
  const dedupe = isServer
    ? await loadServerNotificationDedupe(supabase, userId, 'saved_search')
    : readDedupe();
  const dedupeKeysToMark: string[] = [];
  let nextState = { ...workerState };

  for (const search of saved) {
    if (!isSavedSearchAlertEnabled(search.id)) continue;
    const seen = new Set(nextState[search.id] || []);
    const matches = findNewSavedSearchMatches(search, products, seen);
    if (matches.length === 0) continue;

    const top = matches[0];
    const dedupeKey = `${search.id}:${top.id}`;
    if (wasRecentlyNotified(dedupe, dedupeKey)) {
      nextState = mergeSeenIds(nextState, search.id, matches.map((m) => m.id));
      continue;
    }

    const extra = matches.length > 1 ? ` (+${matches.length - 1})` : '';
    const routed = await routeMarketplaceNotification(
      supabase,
      {
        userId,
        type: 'saved_search',
        title: 'Új találat a mentett keresésedben',
        body: `${search.label}: ${top.name}${extra}`,
        link: '/browse',
      },
      { userEmail },
    );

    const delivered = routed.inApp || routed.push || routed.email;
    if (delivered) {
      if (routed.inApp) notified += 1;
      if (routed.push || routed.email) outboundQueued += 1;
      dedupeKeysToMark.push(dedupeKey);
      if (!isServer) dedupe[dedupeKey] = Date.now();
      nextState = mergeSeenIds(
        nextState,
        search.id,
        matches.map((m) => m.id),
      );
    }
  }

  if (isServer && dedupeKeysToMark.length > 0) {
    await markServerNotificationDedupe(supabase, userId, 'saved_search', dedupeKeysToMark);
  } else if (!isServer) {
    writeDedupe(dedupe);
  }
  await persistWorkerState(supabase, userId, nextState, useAdmin);

  if ((notified > 0 || outboundQueued > 0) && typeof window !== 'undefined') {
    void requestNotificationFlush();
  }

  return {
    notified,
    outboundQueued,
    searchesChecked: saved.filter((s) => isSavedSearchAlertEnabled(s.id)).length,
  };
}
