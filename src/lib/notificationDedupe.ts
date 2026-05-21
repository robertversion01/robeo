import type { SupabaseClient } from '@supabase/supabase-js';

/** Központi szerver oldali értesítés-dedupe (user_metadata). */
export const NOTIFICATION_DEDUPE_META = 'robeo_notification_dedupe_v1';

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type DedupeNamespace = 'saved_search' | 'price_drop' | 'seller_new_item' | 'general';

function pruneMap(map: Record<string, number>): Record<string, number> {
  const now = Date.now();
  const next: Record<string, number> = {};
  for (const [k, ts] of Object.entries(map)) {
    if (now - ts < MAX_AGE_MS) next[k] = ts;
  }
  return next;
}

async function loadMeta(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const admin = supabase.auth.admin;
  if (admin?.getUserById) {
    const { data } = await admin.getUserById(userId);
    return (data?.user?.user_metadata || {}) as Record<string, unknown>;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) return (user.user_metadata || {}) as Record<string, unknown>;
  return null;
}

async function saveMeta(
  supabase: SupabaseClient,
  userId: string,
  meta: Record<string, unknown>,
): Promise<void> {
  const admin = supabase.auth.admin;
  if (admin?.updateUserById) {
    await admin.updateUserById(userId, { user_metadata: meta });
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) {
    await supabase.auth.updateUser({ data: meta });
  }
}

function readNamespace(
  meta: Record<string, unknown>,
  ns: DedupeNamespace,
): Record<string, number> {
  const root = meta[NOTIFICATION_DEDUPE_META];
  if (!root || typeof root !== 'object') return {};
  const bucket = (root as Record<string, unknown>)[ns];
  if (!bucket || typeof bucket !== 'object') return {};
  return pruneMap(bucket as Record<string, number>);
}

export async function loadServerNotificationDedupe(
  supabase: SupabaseClient,
  userId: string,
  ns: DedupeNamespace,
): Promise<Record<string, number>> {
  const meta = await loadMeta(supabase, userId);
  if (!meta) return {};
  return readNamespace(meta, ns);
}

export async function markServerNotificationDedupe(
  supabase: SupabaseClient,
  userId: string,
  ns: DedupeNamespace,
  keys: string[],
): Promise<void> {
  const meta = (await loadMeta(supabase, userId)) || {};
  const root = (meta[NOTIFICATION_DEDUPE_META] || {}) as Record<string, unknown>;
  const bucket = pruneMap(readNamespace(meta, ns));
  const now = Date.now();
  for (const k of keys) bucket[k] = now;

  await saveMeta(supabase, userId, {
    ...meta,
    [NOTIFICATION_DEDUPE_META]: {
      ...root,
      [ns]: bucket,
    },
  });
}

export function wasRecentlyNotified(
  dedupe: Record<string, number>,
  key: string,
): boolean {
  const ts = dedupe[key];
  if (!ts) return false;
  return Date.now() - ts < MAX_AGE_MS;
}
