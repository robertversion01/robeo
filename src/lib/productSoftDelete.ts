import type { SupabaseClient } from '@supabase/supabase-js';
import { formatSupabaseError } from '@/lib/offers';

/** Vinted-stílus: nincs fizikai DELETE, csak status = deleted (FK-k megmaradnak). */
export async function softDeleteProduct(
  supabase: SupabaseClient,
  productId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('products')
    .update({ status: 'deleted' })
    .eq('id', productId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    return { ok: false, error: formatSupabaseError(error) };
  }
  if (!data) {
    return { ok: false, error: 'A termék nem található, vagy nincs jogosultságod a törléshez.' };
  }
  return { ok: true };
}

/** Összes saját hirdetés lekapcsolása (nem deleted státuszúak). */
export async function softDeleteAllUserProducts(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('products')
    .update({ status: 'deleted' })
    .eq('user_id', userId)
    .neq('status', 'deleted')
    .select('id');

  if (error) {
    return { ok: false, error: formatSupabaseError(error) };
  }
  return { ok: true, count: data?.length ?? 0 };
}
