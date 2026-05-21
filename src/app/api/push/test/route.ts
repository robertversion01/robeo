import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { sendWebPushToUser } from '@/lib/webPushSend';
import { isWebPushConfigured } from '@/lib/webPushConfig';
import { parsePushSubscriptions } from '@/lib/pushSubscriptions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!isWebPushConfigured()) {
      return NextResponse.json(
        { error: 'VAPID kulcsok nincsenek beállítva (NEXT_PUBLIC_VAPID_* / VAPID_PRIVATE_KEY)' },
        { status: 503 },
      );
    }

    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: 'Auth config missing' }, { status: 500 });
    }

    const authClient = createClient(url, anon);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Service role required' }, { status: 500 });
    }

    const { data: userRow } = await db.auth.admin.getUserById(user.id);
    const subs = parsePushSubscriptions(
      (userRow?.user?.user_metadata || {}) as Record<string, unknown>,
    );

    if (subs.length === 0) {
      return NextResponse.json(
        {
          error: 'no_subscription',
          hint: 'Profil → Kézbesítés → kapcsold be a push értesítéseket előbb.',
        },
        { status: 400 },
      );
    }

    const result = await sendWebPushToUser(db, user.id, {
      title: 'ROBEO teszt értesítés',
      body: 'A Web Push bekötés működik. (Demo mód)',
      url: '/notifications',
    });

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      subscriptions: subs.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Test push failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
