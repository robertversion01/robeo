import type { CatalogFilterState } from '@/lib/catalogFilters';

export type SavedSearch = {
  id: string;
  label: string;
  filters: Pick<
    CatalogFilterState,
    'category' | 'brand' | 'size' | 'condition' | 'minPrice' | 'maxPrice' | 'sort' | 'search'
  >;
  createdAt: string;
};

const STORAGE_KEY = 'robeo_saved_searches_v1';
const MAX_SAVED = 12;

function readAll(): SavedSearch[] {
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

function writeAll(items: SavedSearch[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_SAVED)));
}

export function listSavedSearches(): SavedSearch[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function saveSearch(label: string, filters: SavedSearch['filters']): SavedSearch {
  const entry: SavedSearch = {
    id: crypto.randomUUID(),
    label: label.trim() || filters.search.trim() || 'Keresés',
    filters: { ...filters },
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...readAll().filter((s) => !isSameFilters(s.filters, filters))];
  writeAll(next);
  return entry;
}

export function removeSavedSearch(id: string) {
  writeAll(readAll().filter((s) => s.id !== id));
}

function isSameFilters(a: SavedSearch['filters'], b: SavedSearch['filters']) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function defaultSavedSearchLabel(filters: SavedSearch['filters']): string {
  const parts: string[] = [];
  if (filters.search.trim()) parts.push(filters.search.trim());
  if (filters.category !== 'all') parts.push(filters.category);
  if (filters.brand !== 'all') parts.push(filters.brand);
  if (filters.size !== 'all') parts.push(filters.size);
  if (filters.condition !== 'all') parts.push(filters.condition);
  return parts.slice(0, 3).join(' · ') || 'Keresés';
}
