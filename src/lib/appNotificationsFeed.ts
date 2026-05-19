import type { SupabaseClient } from '@supabase/supabase-js';

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
  const { data, error } = await supabase
    .from('app_notifications')
    .select('id, type, title, body, link, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[appNotifications] fetch failed', error.message);
    return [];
  }
  return (data || []) as AppNotificationRow[];
}

export async function markAllAppNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await supabase
    .from('app_notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

export async function markAppNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
): Promise<void> {
  await supabase.from('app_notifications').update({ is_read: true }).eq('id', notificationId);
}
