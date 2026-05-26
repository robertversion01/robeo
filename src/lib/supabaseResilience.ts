import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

/** Hiányzó tábla/oszlop, PostgREST 404 / schema cache hibák. */
export function isSupabaseSchemaError(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  const code = error.code ?? '';

  if (code === 'PGRST205' || code === 'PGRST204' || code === '42703' || code === '42P01') {
    return true;
  }
  if (msg.includes('schema cache') || msg.includes('could not find the table')) {
    return true;
  }
  if (msg.includes('does not exist')) {
    return (
      msg.includes('relation') ||
      msg.includes('column') ||
      msg.includes('table')
    );
  }
  return false;
}

export function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null,
): boolean {
  if (!error) return false;
  if (isSupabaseSchemaError(error)) {
    const msg = (error.message ?? '').toLowerCase();
    return msg.includes('column') || error.code === '42703' || error.code === 'PGRST204';
  }
  return false;
}

export const TX_LABEL_SELECT_SETS = [
  'id, status, product_id, buyer_id, seller_id, foxpost_terminal_id, foxpost_terminal_name, foxpost_terminal_address, tracking_number',
  'id, status, product_id, buyer_id, seller_id, tracking_number',
  'id, status, product_id, buyer_id, seller_id',
] as const;

export const TX_CHAT_SELECT_SETS = [
  'id, status, product_id, buyer_id, seller_id, tracking_number, payment_intent_id, dispute_status, foxpost_terminal_id, foxpost_terminal_name, foxpost_terminal_address',
  'id, status, product_id, buyer_id, seller_id, tracking_number, payment_intent_id',
  'id, status, product_id, buyer_id, seller_id',
] as const;

type TransactionLookupFilters = {
  id?: string;
  productId?: string;
  sellerId?: string;
  buyerId?: string;
};

/** transactions select több oszlop-kísérlettel (hiányzó foxpost / tracking oszlopok ellen). */
export async function fetchTransactionWithColumnFallback<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  filters: TransactionLookupFilters,
  columnSets: readonly string[] = TX_LABEL_SELECT_SETS,
): Promise<{ data: T | null; error: PostgrestError | null }> {
  for (const columns of columnSets) {
    let query = supabase.from('transactions').select(columns);
    if (filters.id) query = query.eq('id', filters.id);
    if (filters.productId) query = query.eq('product_id', filters.productId);
    if (filters.sellerId) query = query.eq('seller_id', filters.sellerId);
    if (filters.buyerId) query = query.eq('buyer_id', filters.buyerId);
    if (!filters.id) {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      return { data: data as unknown as T, error: null };
    }
    if (error && !isSupabaseSchemaError(error)) {
      return { data: null, error };
    }
  }
  return { data: null, error: null };
}

/** profiles select több oszlop-kísérlettel (full_name nélkül is működik). */
export async function fetchProfileRow<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  userId: string,
  columnSets: string[],
): Promise<T | null> {
  for (const columns of columnSets) {
    const { data, error } = await supabase
      .from('profiles')
      .select(columns)
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as T;
    }
    if (error && !isMissingColumnError(error) && !isSupabaseSchemaError(error)) {
      console.warn('[profiles] select failed', columns, error.message);
      return null;
    }
    if (error && isSupabaseSchemaError(error) && !isMissingColumnError(error)) {
      return null;
    }
  }
  return null;
}

export async function countUnreadAppNotifications(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('app_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      if (!isSupabaseSchemaError(error)) {
        console.warn('[app_notifications] unread count failed', error.message);
      }
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function markAllAppNotificationsReadSafe(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('app_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error && !isSupabaseSchemaError(error)) {
      console.warn('[app_notifications] mark all read failed', error.message);
    }
  } catch {
    /* ignore */
  }
}

export async function insertAppNotificationSafe(
  supabase: SupabaseClient,
  row: {
    user_id: string;
    type: string;
    title: string;
    body?: string | null;
    link?: string | null;
  },
): Promise<boolean> {
  try {
    const text = row.body ?? row.title;
    const { error } = await supabase.from('app_notifications').insert({
      ...row,
      body: text,
      message: text,
      is_read: false,
    });
    if (error) {
      if (!isSupabaseSchemaError(error)) {
        console.warn('[app_notifications] insert failed', error.message);
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** null = a follows tábla nem elérhető (404 / nincs patch). */
export async function isFollowingSeller(
  supabase: SupabaseClient,
  followerId: string,
  sellerId: string,
): Promise<boolean | null> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', sellerId)
      .maybeSingle();

    if (error) {
      if (isSupabaseSchemaError(error)) return null;
      console.warn('[follows] select failed', error.message);
      return false;
    }
    return Boolean(data);
  } catch {
    return null;
  }
}

export async function setFollowSeller(
  supabase: SupabaseClient,
  followerId: string,
  sellerId: string,
  follow: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (follow) {
      const { error } = await supabase.from('follows').insert({
        follower_id: followerId,
        following_id: sellerId,
      });
      if (error) {
        if (isSupabaseSchemaError(error)) {
          return { ok: false, error: 'A követés funkció még nincs telepítve az adatbázisban.' };
        }
        return { ok: false, error: error.message };
      }
      return { ok: true };
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', sellerId);

    if (error) {
      if (isSupabaseSchemaError(error)) {
        return { ok: false, error: 'A követés funkció még nincs telepítve az adatbázisban.' };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ismeretlen hiba' };
  }
}
