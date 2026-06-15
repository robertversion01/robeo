import type { SupabaseClient } from '@supabase/supabase-js';
import type { TFunction } from 'i18next';
import { isMissingColumnError } from '@/lib/productSchema';

const SESSION_KEY = 'robeo_last_heartbeat';
const MIN_INTERVAL_MS = 5 * 60 * 1000;

export function formatLastActiveLabel(
  lastActiveAt: string | null | undefined,
  t: TFunction,
): string | null {
  if (!lastActiveAt) return null;
  const ms = Date.now() - new Date(lastActiveAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return t('sellerTrust.activeNow');
  if (hours < 24) return t('sellerTrust.activeHours', { hours });
  const days = Math.floor(hours / 24);
  if (days < 14) return t('sellerTrust.activeDays', { days });
  return null;
}

export async function pingProfileActivity(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  if (typeof window !== 'undefined') {
    const last = Number(sessionStorage.getItem(SESSION_KEY) || 0);
    if (Date.now() - last < MIN_INTERVAL_MS) return;
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('profiles').update({ last_active_at: now }).eq('id', userId);
  if (error?.message && isMissingColumnError(error.message, 'last_active_at')) {
    await supabase.auth.updateUser({ data: { robeo_last_active_at: now } });
  }
}

export async function fetchSellerLastActive(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('last_active_at')
    .eq('id', sellerId)
    .maybeSingle();

  if (!error && data?.last_active_at) {
    return String(data.last_active_at);
  }

  if (error?.message && !isMissingColumnError(error.message, 'last_active_at')) {
    return null;
  }

  return null;
}
