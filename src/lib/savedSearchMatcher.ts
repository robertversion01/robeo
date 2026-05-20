import type { Product } from '@/types';
import type { SavedSearch } from '@/lib/savedSearches';
import { productMatchesSavedSearch } from '@/lib/savedSearchMatchCore';
import { isSavedSearchAlertEnabled } from '@/lib/savedSearchAlerts';

const SEEN_KEY = 'robeo_saved_search_seen_v1';
const MATCH_KEY = 'robeo_saved_search_new_counts_v1';

function readSeen(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') as Record<string, string[]>;
  } catch {
    return {};
  }
}

function writeSeen(map: Record<string, string[]>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SEEN_KEY, JSON.stringify(map));
}

function readCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(MATCH_KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writeCounts(map: Record<string, number>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MATCH_KEY, JSON.stringify(map));
}

/** Új találatok száma mentett keresésenként (local snapshot) */
export function scanSavedSearchNewMatches(
  saved: SavedSearch[],
  products: Product[],
): Record<string, number> {
  const seen = readSeen();
  const counts: Record<string, number> = {};

  for (const entry of saved) {
    if (!isSavedSearchAlertEnabled(entry.id)) {
      counts[entry.id] = 0;
      continue;
    }
    const seenIds = new Set(seen[entry.id] || []);
    const matching = products.filter((p) => productMatchesSavedSearch(p, entry.filters));
    const newOnes = matching.filter((p) => !seenIds.has(p.id));
    counts[entry.id] = newOnes.length;
  }

  writeCounts(counts);
  return counts;
}

export function getSavedSearchNewCount(searchId: string): number {
  return readCounts()[searchId] || 0;
}

export function markSavedSearchSeen(searchId: string, productIds: string[]) {
  const seen = readSeen();
  const prev = new Set(seen[searchId] || []);
  for (const id of productIds) prev.add(id);
  seen[searchId] = Array.from(prev);
  writeSeen(seen);
  const counts = readCounts();
  counts[searchId] = 0;
  writeCounts(counts);
}

export function clearSavedSearchNewBadge(searchId: string) {
  const counts = readCounts();
  counts[searchId] = 0;
  writeCounts(counts);
}
