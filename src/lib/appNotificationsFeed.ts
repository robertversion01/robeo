import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isSupabaseSchemaError,
  markAllAppNotificationsReadSafe,
} from '@/lib/supabaseResilience';

export type AppNotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function isNotificationUnread(row: Pick<AppNotificationRow, 'is_read'>): boolean {
  return !row.is_read;
}

export async function fetchAppNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<AppNotificationRow[]> {
  try {
    const { data, error } = await supabase
      .from('app_notifications')
      .select('id, type, title, body, link, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (!isSupabaseSchemaError(error)) {
        console.warn('[appNotifications] fetch failed', error.message);
      }
      return [];
    }
    return (data || []) as AppNotificationRow[];
  } catch {
    return [];
  }
}

export async function markAllAppNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await markAllAppNotificationsReadSafe(supabase, userId);
}

export async function markAppNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('app_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error && !isSupabaseSchemaError(error)) {
      console.warn('[appNotifications] mark read failed', error.message);
    }
  } catch {
    /* ignore */
  }
}
