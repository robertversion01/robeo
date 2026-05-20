import type { SupabaseClient } from '@supabase/supabase-js';

const META_KEY = 'robeo_saved_search_worker_state';

export type SavedSearchWorkerState = Record<string, string[]>;

export function parseSavedSearchWorkerState(
  metadata: Record<string, unknown> | undefined,
): SavedSearchWorkerState {
  const raw = metadata?.[META_KEY];
  if (!raw || typeof raw !== 'object') return {};
  const out: SavedSearchWorkerState = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v)) out[k] = v.map(String).filter(Boolean);
  }
  return out;
}

export async function loadSavedSearchWorkerState(
  supabase: SupabaseClient,
): Promise<SavedSearchWorkerState> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  return parseSavedSearchWorkerState(user.user_metadata as Record<string, unknown>);
}

export async function persistSavedSearchWorkerState(
  supabase: SupabaseClient,
  state: SavedSearchWorkerState,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  await supabase.auth.updateUser({
    data: {
      ...meta,
      [META_KEY]: state,
    },
  });
}

/** Szerver / admin kliens — konkrét userId */
export async function loadSavedSearchWorkerStateForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SavedSearchWorkerState> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) return {};
    return parseSavedSearchWorkerState(data.user.user_metadata as Record<string, unknown>);
  } catch {
    return {};
  }
}

export async function persistSavedSearchWorkerStateForUser(
  supabase: SupabaseClient,
  userId: string,
  state: SavedSearchWorkerState,
): Promise<void> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) return;
    const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { ...meta, [META_KEY]: state },
    });
  } catch {
    /* ignore */
  }
}

export function mergeSeenIds(
  state: SavedSearchWorkerState,
  searchId: string,
  productIds: string[],
): SavedSearchWorkerState {
  const prev = new Set(state[searchId] || []);
  for (const id of productIds) prev.add(id);
  return { ...state, [searchId]: Array.from(prev).slice(-500) };
}
