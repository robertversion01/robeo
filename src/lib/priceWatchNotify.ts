import type { SupabaseClient } from '@supabase/supabase-js';
import type { PriceDropHit } from '@/lib/priceWatch';
import { loadUserPreferences } from '@/lib/userPreferences';
import { routeMarketplaceNotification } from '@/lib/notificationChannels';
import { requestNotificationFlush } from '@/lib/notificationFlushClient';

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
  let anyRouted = false;
  for (const hit of hits) {
    const key = `${hit.productId}:${hit.newPrice}`;
    if (dedupe[key]) continue;
    const routed = await routeMarketplaceNotification(supabase, {
      userId,
      type: 'price_drop',
      title: 'Árcsökkenés',
      body: `${hit.productName}: ${hit.oldPrice} → ${hit.newPrice} Ft`,
      link: `/products/${hit.productId}`,
    });
    if (routed.inApp) {
      dedupe[key] = Date.now();
      anyRouted = true;
    }
  }
  writeDedupe(dedupe);
  if (anyRouted) void requestNotificationFlush();
}
