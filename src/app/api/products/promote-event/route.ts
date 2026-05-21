import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { recordPromoteDemoClick, recordPromoteDemoView } from '@/lib/promoteAnalytics';

export const dynamic = 'force-dynamic';

/** Demo: kiemelt termék megtekintés / kattintás számláló */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { productId?: string; type?: 'view' | 'click' };
    const { productId, type } = body;
    if (!productId || !type) {
      return NextResponse.json({ error: 'productId and type required' }, { status: 400 });
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }

    if (type === 'view') await recordPromoteDemoView(db, productId);
    else await recordPromoteDemoClick(db, productId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Event failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
