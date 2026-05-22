import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function runOfferExpiryScan() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('offers')
    .update({
      status: 'cancelled',
      updated_at: now,
    })
    .in('status', ['pending', 'countered'])
    .lt('expires_at', now)
    .select('id');

  if (error) {
    if (error.message?.includes('expires_at') && error.message.includes('does not exist')) {
      return NextResponse.json({
        ok: false,
        hint: 'Run supabase/patch-offer-expiry.sql',
        error: error.message,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    expired: data?.length ?? 0,
    timestamp: now,
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
