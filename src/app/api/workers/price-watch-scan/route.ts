import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { detectPriceDropsFromWatches, type PriceWatchEntry } from '@/lib/priceWatch';
import { notifyPriceDropsIfEnabled } from '@/lib/priceWatchNotify';
import { recordPriceSnapshotRemote } from '@/lib/priceHistory';

export const dynamic = 'force-dynamic';

/**
 * Kliens küldi a figyelt termékek aktuális árait; szerver oldali snapshot + értesítés előkészítés.
 * A price watch lista localStorage-ben van — a kliens továbbítja a payloadot.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, watches, products } = body as {
      userId?: string;
      watches?: PriceWatchEntry[];
      products?: Array<{ id: string; name: string; price: number }>;
    };

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase unavailable' }, { status: 500 });
    }

    const productList = products || [];
    for (const p of productList) {
      await recordPriceSnapshotRemote(supabase, p.id, p.price);
    }

    const effectiveWatches = watches || [];
    if (effectiveWatches.length === 0 || productList.length === 0) {
      return NextResponse.json({ ok: true, drops: 0 });
    }

    const hits = detectPriceDropsFromWatches(effectiveWatches, productList, { persist: false });
    if (hits.length > 0) {
      await notifyPriceDropsIfEnabled(supabase, userId, hits);
    }

    return NextResponse.json({ ok: true, drops: hits.length, hits });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'scan failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
