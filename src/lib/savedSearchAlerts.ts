import type { SavedSearch } from '@/lib/savedSearches';

const ALERTS_KEY = 'robeo_saved_search_alerts_v1';

export type SavedSearchAlertState = Record<string, boolean>;

function readAlerts(): SavedSearchAlertState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ALERTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SavedSearchAlertState;
  } catch {
    return {};
  }
}

function writeAlerts(state: SavedSearchAlertState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ALERTS_KEY, JSON.stringify(state));
}

export function isSavedSearchAlertEnabled(id: string): boolean {
  const state = readAlerts();
  return state[id] !== false;
}

export function setSavedSearchAlertEnabled(id: string, enabled: boolean) {
  const state = readAlerts();
  state[id] = enabled;
  writeAlerts(state);
}

export function countEnabledAlerts(items: SavedSearch[]): number {
  return items.filter((i) => isSavedSearchAlertEnabled(i.id)).length;
}
