import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { PriceWatchEntry } from '@/lib/priceWatch';

const META_KEY = 'robeo_price_watch_v1';

/** Kliens → szerver: metadata + price_watches tábla (ha létezik). */
export async function syncPriceWatchesToServer(
  watches: PriceWatchEntry[],
): Promise<{ ok: boolean; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: 'Nincs bejelentkezve.' };
  }

  const res = await fetch('/api/price-watch/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ watches }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: (data as { error?: string }).error || 'Szinkron sikertelen' };
  }
  return { ok: true };
}

/** API route belső logika */
export async function persistPriceWatchesServer(
  db: SupabaseClient,
  userId: string,
  watches: PriceWatchEntry[],
): Promise<void> {
  const admin = db.auth.admin;
  if (admin?.getUserById && admin?.updateUserById) {
    const { data } = await admin.getUserById(userId);
    const meta = (data?.user?.user_metadata || {}) as Record<string, unknown>;
    await admin.updateUserById(userId, {
      user_metadata: { ...meta, [META_KEY]: watches },
    });
  }

  for (const w of watches) {
    try {
      await db.from('price_watches').upsert(
        {
          user_id: userId,
          product_id: w.productId,
          last_seen_price_huf: Math.round(w.lastPrice),
          target_price_huf: w.targetPrice != null ? Math.round(w.targetPrice) : null,
          alert_enabled: w.alertEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id' },
      );
    } catch {
      /* tábla hiányában metadata elég */
    }
  }
}
