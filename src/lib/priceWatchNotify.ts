import type { SupabaseClient } from '@supabase/supabase-js';
import { insertAppNotificationSafe } from '@/lib/supabaseResilience';
import type { PriceDropHit } from '@/lib/priceWatch';
import { loadUserPreferences } from '@/lib/userPreferences';

const DEDUPE_KEY = 'robeo_price_drop_notified_v1';

function readDedupe(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(DEDUPE_KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writeDedupe(map: Record<string, number>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEDUPE_KEY, JSON.stringify(map));
}

/** In-app értesítés árcsökkenésről (egyszer termékenként új árszinthez) */
export async function notifyPriceDropsIfEnabled(
  supabase: SupabaseClient,
  userId: string,
  hits: PriceDropHit[],
): Promise<void> {
  if (hits.length === 0) return;
  const prefs = await loadUserPreferences(supabase);
  if (!prefs.notifications.priceDrops) return;

  const dedupe = readDedupe();
  for (const hit of hits) {
    const key = `${hit.productId}:${hit.newPrice}`;
    if (dedupe[key]) continue;
    const ok = await insertAppNotificationSafe(supabase, {
      user_id: userId,
      type: 'price_drop',
      title: 'Árcsökkenés',
      body: `${hit.productName}: ${hit.oldPrice} → ${hit.newPrice} Ft`,
      link: `/products/${hit.productId}`,
    });
    if (ok) dedupe[key] = Date.now();
  }
  writeDedupe(dedupe);
}
