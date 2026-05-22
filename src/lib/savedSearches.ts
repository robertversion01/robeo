import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogFilterState } from '@/lib/catalogFilters';

export type SavedSearch = {
  id: string;
  label: string;
  filters: Pick<
    CatalogFilterState,
    'category' | 'subcategory' | 'brand' | 'size' | 'condition' | 'color' | 'minPrice' | 'maxPrice' | 'sort' | 'search'
  >;
  createdAt: string;
};

const STORAGE_KEY = 'robeo_saved_searches_v1';
const METADATA_KEY = 'robeo_saved_searches';
const MAX_SAVED = 12;

function readLocal(): SavedSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSearch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: SavedSearch[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_SAVED)));
}

function isSameFilters(a: SavedSearch['filters'], b: SavedSearch['filters']) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mergeLists(local: SavedSearch[], remote: SavedSearch[]): SavedSearch[] {
  const map = new Map<string, SavedSearch>();
  for (const item of [...remote, ...local]) {
    const key = JSON.stringify(item.filters);
    const existing = map.get(key);
    if (!existing || new Date(item.createdAt) > new Date(existing.createdAt)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_SAVED);
}

export function listSavedSearchesLocal(): SavedSearch[] {
  return readLocal().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function fetchSavedSearchesFromUser(
  supabase: SupabaseClient,
): Promise<SavedSearch[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const raw = user.user_metadata?.[METADATA_KEY];
  if (!Array.isArray(raw)) return [];
  return raw as SavedSearch[];
}

export async function persistSavedSearchesToUser(
  supabase: SupabaseClient,
  items: SavedSearch[],
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.auth.updateUser({
    data: { [METADATA_KEY]: items.slice(0, MAX_SAVED) },
  });
}

export async function loadSavedSearchesMerged(
  supabase: SupabaseClient,
): Promise<SavedSearch[]> {
  const local = listSavedSearchesLocal();
  const remote = await fetchSavedSearchesFromUser(supabase);
  const merged = mergeLists(local, remote);
  writeLocal(merged);
  if (remote.length > 0 || local.length > 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await persistSavedSearchesToUser(supabase, merged);
    }
  }
  return merged;
}

export async function saveSearchEntry(
  supabase: SupabaseClient,
  label: string,
  filters: SavedSearch['filters'],
): Promise<SavedSearch> {
  const entry: SavedSearch = {
    id: crypto.randomUUID(),
    label: label.trim() || filters.search.trim() || 'search',
    filters: { ...filters },
    createdAt: new Date().toISOString(),
  };
  const current = await loadSavedSearchesMerged(supabase);
  const next = [entry, ...current.filter((s) => !isSameFilters(s.filters, filters))].slice(
    0,
    MAX_SAVED,
  );
  writeLocal(next);
  await persistSavedSearchesToUser(supabase, next);
  return entry;
}

export async function removeSavedSearchEntry(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const current = await loadSavedSearchesMerged(supabase);
  const next = current.filter((s) => s.id !== id);
  writeLocal(next);
  await persistSavedSearchesToUser(supabase, next);
}

/** @deprecated use loadSavedSearchesMerged */
export function listSavedSearches(): SavedSearch[] {
  return listSavedSearchesLocal();
}

/** @deprecated use saveSearchEntry */
export function saveSearch(label: string, filters: SavedSearch['filters']): SavedSearch {
  const entry: SavedSearch = {
    id: crypto.randomUUID(),
    label: label.trim() || filters.search.trim() || 'search',
    filters: { ...filters },
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...readLocal().filter((s) => !isSameFilters(s.filters, filters))];
  writeLocal(next);
  return entry;
}

/** @deprecated use removeSavedSearchEntry */
export function removeSavedSearch(id: string) {
  writeLocal(readLocal().filter((s) => s.id !== id));
}

export function defaultSavedSearchLabel(filters: SavedSearch['filters']): string {
  const parts: string[] = [];
  if (filters.search.trim()) parts.push(filters.search.trim());
  if (filters.category !== 'all') parts.push(filters.category);
  if (filters.brand !== 'all') parts.push(filters.brand);
  if (filters.size !== 'all') parts.push(filters.size);
  if (filters.condition !== 'all') parts.push(filters.condition);
  return parts.slice(0, 3).join(' · ') || 'search';
}
