import type { SupabaseClient } from '@supabase/supabase-js';

export async function loadProfileVacationMode(
  db: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('profiles')
    .select('vacation_mode')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (/vacation_mode/i.test(error.message)) return false;
    console.warn('[vacationMode] load failed', error.message);
    return false;
  }

  return Boolean(data?.vacation_mode);
}

export async function setProfileVacationMode(
  db: SupabaseClient,
  userId: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db
    .from('profiles')
    .update({ vacation_mode: enabled })
    .eq('id', userId);

  if (error) {
    if (/vacation_mode/i.test(error.message)) {
      return { ok: false, error: 'vacation_mode_column_missing' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** Aktív szabadság módban lévő eladók ID-i (feed szűréshez). */
export async function fetchVacationSellerIdSet(
  db: SupabaseClient,
  sellerIds: string[],
): Promise<Set<string>> {
  const unique = [...new Set(sellerIds.filter(Boolean))];
  if (unique.length === 0) return new Set();

  const { data, error } = await db
    .from('profiles')
    .select('id')
    .in('id', unique)
    .eq('vacation_mode', true);

  if (error) {
    if (/vacation_mode/i.test(error.message)) return new Set();
    console.warn('[vacationMode] fetch sellers failed', error.message);
    return new Set();
  }

  return new Set((data || []).map((r) => r.id as string));
}

export function filterProductsExcludingVacationSellers<T extends { user_id: string }>(
  products: T[],
  vacationSellerIds: Set<string>,
): T[] {
  if (vacationSellerIds.size === 0) return products;
  return products.filter((p) => !vacationSellerIds.has(p.user_id));
}
