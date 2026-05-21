import type { SupabaseClient } from '@supabase/supabase-js';
import type { PriceDropHit } from '@/lib/priceWatch';
import { loadUserPreferences, parseUserPreferences } from '@/lib/userPreferences';
import { routeMarketplaceNotification } from '@/lib/notificationChannels';
import { requestNotificationFlush } from '@/lib/notificationFlushClient';
import {
  loadServerNotificationDedupe,
  markServerNotificationDedupe,
  wasRecentlyNotified,
} from '@/lib/notificationDedupe';

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
    if (wasRecentlyNotified(dedupe, key)) continue;
    const routed = await routeMarketplaceNotification(supabase, {
      userId,
      type: 'price_drop',
      title: 'Árcsökkenés',
      body: `${hit.productName}: ${hit.oldPrice} → ${hit.newPrice} Ft`,
      link: `/products/${hit.productId}`,
    });
    if (routed.inApp || routed.push || routed.email) {
      dedupe[key] = Date.now();
      anyRouted = true;
    }
  }
  writeDedupe(dedupe);
  if (anyRouted) void requestNotificationFlush();
}

/** Szerver cron — in-app + outbox, szerver oldali dedupe */
export async function notifyPriceDropsServer(
  supabase: SupabaseClient,
  userId: string,
  hits: PriceDropHit[],
): Promise<{ notified: number; outboundQueued: number }> {
  if (hits.length === 0) return { notified: 0, outboundQueued: 0 };

  let priceDropsEnabled = true;
  const admin = supabase.auth.admin;
  if (admin?.getUserById) {
    const { data } = await admin.getUserById(userId);
    const prefs = parseUserPreferences(
      (data?.user?.user_metadata || {}) as Record<string, unknown>,
    );
    priceDropsEnabled = prefs.notifications.priceDrops;
  } else {
    const prefs = await loadUserPreferences(supabase);
    priceDropsEnabled = prefs.notifications.priceDrops;
  }
  if (!priceDropsEnabled) return { notified: 0, outboundQueued: 0 };

  const dedupe = await loadServerNotificationDedupe(supabase, userId, 'price_drop');
  const keysToMark: string[] = [];
  let notified = 0;
  let outboundQueued = 0;

  for (const hit of hits) {
    const key = `${hit.productId}:${hit.newPrice}`;
    if (wasRecentlyNotified(dedupe, key)) continue;

    const body = `Árcsökkenés! ${hit.productName} most ${hit.newPrice.toLocaleString('hu-HU')} Ft (${hit.oldPrice.toLocaleString('hu-HU')} Ft helyett).`;

    const routed = await routeMarketplaceNotification(
      supabase,
      {
        userId,
        type: 'price_drop',
        title: 'Árcsökkenés! A kiszemelt termék most olcsóbb lett!',
        body,
        link: `/products/${hit.productId}`,
      },
      { userEmail: null },
    );

    if (routed.inApp) notified += 1;
    if (routed.push || routed.email) outboundQueued += 1;
    if (routed.inApp || routed.push || routed.email) {
      keysToMark.push(key);
    }
  }

  if (keysToMark.length > 0) {
    await markServerNotificationDedupe(supabase, userId, 'price_drop', keysToMark);
  }
  return { notified, outboundQueued };
}
