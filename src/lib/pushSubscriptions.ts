import type { SupabaseClient } from '@supabase/supabase-js';

export const PUSH_SUBSCRIPTIONS_META_KEY = 'robeo_web_push_subscriptions_v1';

export type StoredPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
  createdAt: string;
};

export function parsePushSubscriptions(
  metadata: Record<string, unknown> | undefined,
): StoredPushSubscription[] {
  const raw = metadata?.[PUSH_SUBSCRIPTIONS_META_KEY];
  if (!Array.isArray(raw)) return [];
  const out: StoredPushSubscription[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const endpoint = typeof o.endpoint === 'string' ? o.endpoint : '';
    const keys = o.keys as Record<string, unknown> | undefined;
    const p256dh = typeof keys?.p256dh === 'string' ? keys.p256dh : '';
    const auth = typeof keys?.auth === 'string' ? keys.auth : '';
    if (!endpoint || !p256dh || !auth) continue;
    out.push({
      endpoint,
      expirationTime: typeof o.expirationTime === 'number' ? o.expirationTime : null,
      keys: { p256dh, auth },
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
    });
  }
  return out;
}

function normalizeIncoming(
  sub: {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  },
): StoredPushSubscription {
  return {
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime ?? null,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    createdAt: new Date().toISOString(),
  };
}

export async function savePushSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  },
): Promise<boolean> {
  const admin = supabase.auth.admin;
  if (!admin?.getUserById) return false;

  const { data, error } = await admin.getUserById(userId);
  if (error || !data?.user) return false;

  const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
  const list = parsePushSubscriptions(meta);
  const next = normalizeIncoming(subscription);
  const filtered = list.filter((s) => s.endpoint !== next.endpoint);
  filtered.unshift(next);
  const trimmed = filtered.slice(0, 10);

  const { error: updateError } = await admin.updateUserById(userId, {
    user_metadata: { ...meta, [PUSH_SUBSCRIPTIONS_META_KEY]: trimmed },
  });
  return !updateError;
}

export async function removePushSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
): Promise<boolean> {
  const admin = supabase.auth.admin;
  if (!admin?.getUserById) return false;

  const { data, error } = await admin.getUserById(userId);
  if (error || !data?.user) return false;

  const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
  const list = parsePushSubscriptions(meta).filter((s) => s.endpoint !== endpoint);

  const { error: updateError } = await admin.updateUserById(userId, {
    user_metadata: { ...meta, [PUSH_SUBSCRIPTIONS_META_KEY]: list },
  });
  return !updateError;
}
