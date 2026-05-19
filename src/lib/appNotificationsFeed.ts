import type { SupabaseClient } from '@supabase/supabase-js';

export type AppNotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export async function fetchAppNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<AppNotificationRow[]> {
  const { data, error } = await supabase
    .from('app_notifications')
    .select('id, type, title, body, link, read_at, created_at')
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
  const now = new Date().toISOString();
  await supabase
    .from('app_notifications')
    .update({ read_at: now })
    .eq('user_id', userId)
    .is('read_at', null);
}

export async function markAppNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
): Promise<void> {
  await supabase
    .from('app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
}
