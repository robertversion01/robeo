import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { runPriceWatchCronScan } from '@/lib/priceWatchServer';
import { detectPriceDropsFromWatches, type PriceWatchEntry } from '@/lib/priceWatch';
import { notifyPriceDropsIfEnabled } from '@/lib/priceWatchNotify';
import { recordPriceSnapshotRemote } from '@/lib/priceHistory';

export const dynamic = 'force-dynamic';

function requireCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

/** Vercel Cron — GET + Bearer CRON_SECRET */
export async function GET(req: NextRequest) {
  if (!requireCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runCronScan();
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Admin Supabase unavailable' }, { status: 500 });
  }

  if (requireCron(req)) {
    return runCronScan();
  }

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

    const productList = products || [];
    for (const p of productList) {
      await recordPriceSnapshotRemote(supabase, p.id, p.price);
    }

    const effectiveWatches = watches || [];
    if (effectiveWatches.length === 0 || productList.length === 0) {
      return NextResponse.json({ ok: true, drops: 0, mode: 'client' });
    }

    const hits = detectPriceDropsFromWatches(effectiveWatches, productList, { persist: false });
    if (hits.length > 0) {
      await notifyPriceDropsIfEnabled(supabase, userId, hits);
    }

    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    const meta = (authData?.user?.user_metadata || {}) as Record<string, unknown>;
    if (authData?.user && effectiveWatches.length > 0) {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { ...meta, robeo_price_watch_v1: effectiveWatches },
      });
    }

    return NextResponse.json({ ok: true, drops: hits.length, hits, mode: 'client' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'scan failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function runCronScan() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Admin Supabase unavailable' }, { status: 500 });
  }

  try {
    const result = await runPriceWatchCronScan(supabase);
    return NextResponse.json({ ok: true, mode: 'cron', ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'cron scan failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
