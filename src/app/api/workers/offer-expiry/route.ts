import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { expireStaleOffers } from '@/lib/offerExpiry';

export const dynamic = 'force-dynamic';

async function runOfferExpiryScan() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const result = await expireStaleOffers(supabase);
  if (result.error) {
    return NextResponse.json(
      {
        ok: false,
        hint: result.error.includes('patch-offer-expiry') ? 'Run supabase/patch-offer-expiry.sql' : undefined,
        error: result.error,
      },
      { status: result.error.includes('patch-offer-expiry') ? 200 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    expired: result.expired,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runOfferExpiryScan();
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runOfferExpiryScan();
}
