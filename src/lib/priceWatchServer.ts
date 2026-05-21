import type { SupabaseClient } from '@supabase/supabase-js';
import type { PriceWatchEntry } from '@/lib/priceWatch';
import { detectPriceDropsFromWatches, type PriceDropHit } from '@/lib/priceWatch';
import { recordPriceSnapshotRemote } from '@/lib/priceHistory';
import { notifyPriceDropsServer } from '@/lib/priceWatchNotify';
import { flushOutboxAfterRoute } from '@/lib/notificationOutbox';

const META_KEY = 'robeo_price_watch_v1';

export function parsePriceWatchesFromMetadata(
  metadata: Record<string, unknown> | undefined,
): PriceWatchEntry[] {
  const raw = metadata?.[META_KEY];
  if (!Array.isArray(raw)) return [];
  return raw as PriceWatchEntry[];
}

export type PriceWatchScanResult = {
  usersScanned: number;
  dropsDetected: number;
  notified: number;
  outboundQueued: number;
};

async function loadWatchesForUser(
  db: SupabaseClient,
  userId: string,
  metadata: Record<string, unknown>,
): Promise<PriceWatchEntry[]> {
  const fromMeta = parsePriceWatchesFromMetadata(metadata);

  let rows: unknown[] | null = null;
  try {
    const res = await db
      .from('price_watches')
      .select('product_id, target_price_huf, last_seen_price_huf, alert_enabled')
      .eq('user_id', userId)
      .eq('alert_enabled', true);
    rows = res.data;
  } catch {
    rows = [];
  }

  const fromDb: PriceWatchEntry[] = (rows || []).map((r) => {
    const row = r as {
      product_id: string;
      target_price_huf: number | null;
      last_seen_price_huf: number;
      alert_enabled: boolean;
    };
    return {
      productId: row.product_id,
      productName: '',
      lastPrice: row.last_seen_price_huf,
      watchedAt: new Date().toISOString(),
      alertEnabled: row.alert_enabled,
      targetPrice: row.target_price_huf ?? undefined,
    };
  });

  const map = new Map<string, PriceWatchEntry>();
  for (const w of [...fromMeta, ...fromDb]) {
    if (w.alertEnabled) map.set(w.productId, w);
  }
  return Array.from(map.values());
}

async function persistWatchPrices(
  db: SupabaseClient,
  userId: string,
  watches: PriceWatchEntry[],
  products: Array<{ id: string; price: number }>,
): Promise<void> {
  for (const w of watches) {
    const p = products.find((x) => x.id === w.productId);
    if (!p) continue;
    try {
      await db.from('price_watches').upsert(
        {
          user_id: userId,
          product_id: w.productId,
          last_seen_price_huf: Math.round(p.price),
          alert_enabled: w.alertEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id' },
      );
    } catch {
      /* table may not exist until patch-vinted-advanced.sql */
    }
  }
}

export async function runPriceWatchScanForUser(
  db: SupabaseClient,
  userId: string,
  userEmail: string | null | undefined,
  metadata: Record<string, unknown>,
): Promise<{ drops: number; notified: number; outboundQueued: number }> {
  const watches = await loadWatchesForUser(db, userId, metadata);
  if (watches.length === 0) {
    return { drops: 0, notified: 0, outboundQueued: 0 };
  }

  const productIds = watches.map((w) => w.productId);
  const { data: products, error } = await db
    .from('products')
    .select('id, name, price')
    .in('id', productIds)
    .or('status.eq.active,status.is.null');

  if (error || !products?.length) {
    return { drops: 0, notified: 0, outboundQueued: 0 };
  }

  const productList = products.map((p) => ({
    id: String((p as { id: string }).id),
    name: String((p as { name: string }).name || 'Termék'),
    price: Math.round(Number((p as { price: number }).price) || 0),
  }));

  for (const p of productList) {
    await recordPriceSnapshotRemote(db, p.id, p.price);
  }

  const hits: PriceDropHit[] = [];
  for (const w of watches) {
    const p = productList.find((x) => x.id === w.productId);
    if (!p) continue;
    const target = w.targetPrice;
    const dropped = p.price < w.lastPrice;
    const hitTarget = typeof target === 'number' && target > 0 && p.price <= target;
    if (dropped || hitTarget) {
      hits.push({
        productId: p.id,
        productName: p.name,
        oldPrice: w.lastPrice,
        newPrice: p.price,
      });
    }
  }

  if (hits.length === 0) {
    await persistWatchPrices(db, userId, watches, productList);
    return { drops: 0, notified: 0, outboundQueued: 0 };
  }

  const notifyResult = await notifyPriceDropsServer(db, userId, hits);
  await flushOutboxAfterRoute(db, userId, userEmail ?? null);

  const updatedWatches = watches.map((w) => {
    const hit = hits.find((h) => h.productId === w.productId);
    if (hit) return { ...w, lastPrice: hit.newPrice, productName: hit.productName };
    const p = productList.find((x) => x.id === w.productId);
    return p ? { ...w, lastPrice: p.price } : w;
  });
  await persistWatchPrices(db, userId, updatedWatches, productList);

  const admin = db.auth.admin;
  if (admin?.getUserById && admin?.updateUserById) {
    const { data: authData } = await admin.getUserById(userId);
    if (authData?.user) {
      const meta = (authData.user.user_metadata || {}) as Record<string, unknown>;
      await admin.updateUserById(userId, {
        user_metadata: { ...meta, [META_KEY]: updatedWatches },
      });
    }
  }

  return {
    drops: hits.length,
    notified: notifyResult.notified,
    outboundQueued: notifyResult.outboundQueued,
  };
}

export async function runPriceWatchCronScan(
  db: SupabaseClient,
): Promise<PriceWatchScanResult> {
  let usersScanned = 0;
  let dropsDetected = 0;
  let totalNotified = 0;
  let totalOutbound = 0;

  const { data: profiles, error } = await db.from('profiles').select('id').limit(400);
  if (error) {
    throw new Error(error.message);
  }

  for (const row of profiles || []) {
    const uid = String((row as { id: string }).id);
    const { data: authData, error: authError } = await db.auth.admin.getUserById(uid);
    if (authError || !authData?.user) continue;

    const meta = (authData.user.user_metadata || {}) as Record<string, unknown>;
    const watches = await loadWatchesForUser(db, uid, meta);
    if (watches.length === 0) continue;

    usersScanned += 1;
    const result = await runPriceWatchScanForUser(
      db,
      uid,
      authData.user.email,
      meta,
    );
    dropsDetected += result.drops;
    totalNotified += result.notified;
    totalOutbound += result.outboundQueued;
  }

  return {
    usersScanned,
    dropsDetected,
    notified: totalNotified,
    outboundQueued: totalOutbound,
  };
}
