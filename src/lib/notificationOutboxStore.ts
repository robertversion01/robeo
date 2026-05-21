import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DeliveryChannel,
  NotificationOutboxItem,
  RoutedNotificationPayload,
} from '@/lib/notificationTypes';

export const QUEUE_META_KEY = 'robeo_notification_outbox_v1';

export function parseNotificationOutbox(
  metadata: Record<string, unknown> | undefined,
): NotificationOutboxItem[] {
  const raw = metadata?.[QUEUE_META_KEY];
  if (!Array.isArray(raw)) return [];
  return raw as NotificationOutboxItem[];
}

async function loadUserMetadata(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) {
    return (user.user_metadata || {}) as Record<string, unknown>;
  }
  const admin = supabase.auth.admin;
  if (!admin?.getUserById) return null;
  const { data, error } = await admin.getUserById(userId);
  if (error || !data?.user) return null;
  return (data.user.user_metadata || {}) as Record<string, unknown>;
}

async function saveUserMetadata(
  supabase: SupabaseClient,
  userId: string,
  meta: Record<string, unknown>,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) {
    const { error } = await supabase.auth.updateUser({ data: meta });
    return !error;
  }
  const admin = supabase.auth.admin;
  if (!admin?.updateUserById) return false;
  const { error } = await admin.updateUserById(userId, { user_metadata: meta });
  return !error;
}

export async function appendToNotificationOutbox(
  supabase: SupabaseClient,
  channel: DeliveryChannel,
  payload: RoutedNotificationPayload,
): Promise<boolean> {
  const meta = await loadUserMetadata(supabase, payload.userId);
  if (!meta) return false;

  const outbox = parseNotificationOutbox(meta);
  outbox.unshift({
    id: crypto.randomUUID(),
    channel,
    payload,
    createdAt: new Date().toISOString(),
  });
  const trimmed = outbox.slice(0, 50);
  return saveUserMetadata(supabase, payload.userId, {
    ...meta,
    [QUEUE_META_KEY]: trimmed,
  });
}
