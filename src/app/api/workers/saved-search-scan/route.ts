import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { runSavedSearchAlertScan } from '@/lib/savedSearchNotify';
import { parseSavedSearchesFromMetadata } from '@/lib/savedSearchesServer';
import { fetchProductsForScan } from '@/lib/productSchema';
import { flushOutboxAfterRoute } from '@/lib/notificationOutbox';

export const dynamic = 'force-dynamic';

const SCAN_LIMIT = 400;

/** Vercel Cron — GET + Authorization: Bearer CRON_SECRET */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const fakeReq = new NextRequest(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({}),
  });
  return POST(fakeReq);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body as { userId?: string };

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Admin Supabase unavailable' }, { status: 500 });
    }

    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    const isCron = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);

    if (isCron) {
      let totalNotified = 0;
      let totalOutbound = 0;
      let usersScanned = 0;
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(300);

      if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
      }

      for (const row of profiles || []) {
        const uid = String((row as { id: string }).id);
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(uid);
        if (authError || !authData?.user) continue;
        const saved = parseSavedSearchesFromMetadata(
          authData.user.user_metadata as Record<string, unknown>,
        );
        if (saved.length === 0) continue;
        usersScanned += 1;
        const result = await scanForUser(supabase, uid, saved, authData.user.email);
        totalNotified += result.notified;
        totalOutbound += result.outboundQueued;
      }

      return NextResponse.json({
        ok: true,
        notified: totalNotified,
        outboundQueued: totalOutbound,
        usersScanned,
        mode: 'cron',
      });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const saved = parseSavedSearchesFromMetadata(
      authData.user.user_metadata as Record<string, unknown>,
    );
    if (saved.length === 0) {
      return NextResponse.json({ ok: true, notified: 0, searchesChecked: 0 });
    }

    const result = await scanForUser(
      supabase,
      userId,
      saved,
      authData.user.email,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'scan failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function scanForUser(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  userId: string,
  saved: ReturnType<typeof parseSavedSearchesFromMetadata>,
  userEmail?: string | null,
) {
  const { data: products, error } = await fetchProductsForScan(supabase, SCAN_LIMIT);

  if (error) {
    throw error;
  }

  const result = await runSavedSearchAlertScan(supabase, userId, saved, products, userEmail);
  if (result.notified > 0 || result.outboundQueued > 0) {
    await flushOutboxAfterRoute(supabase, userId, userEmail);
  }
  return result;
}
