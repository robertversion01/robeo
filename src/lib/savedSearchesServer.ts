import type { SavedSearch } from '@/lib/savedSearches';

const METADATA_KEY = 'robeo_saved_searches';

export function parseSavedSearchesFromMetadata(
  metadata: Record<string, unknown> | undefined,
): SavedSearch[] {
  const raw = metadata?.[METADATA_KEY];
  if (!Array.isArray(raw)) return [];
  return raw as SavedSearch[];
}
