import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { runDistrictDigestScan } from '@/lib/districtDigest';

export const dynamic = 'force-dynamic';

/** Heti kerületi digest — BP userek homeDistrict preferenciája alapján. */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return run();
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return run();
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

async function run() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Admin Supabase unavailable' }, { status: 503 });
  }

  const result = await runDistrictDigestScan(supabase);
  return NextResponse.json({ ok: true, ...result, mode: 'district_digest' });
}
