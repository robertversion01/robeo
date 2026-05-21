import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { softAnonymizeProfile } from '@/lib/gdprExport';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
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

    const body = (await req.json().catch(() => ({}))) as { confirm?: boolean };
    if (!body.confirm) {
      return NextResponse.json(
        { error: 'Add { "confirm": true } to confirm account anonymization.' },
        { status: 400 },
      );
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Service role required' }, { status: 500 });
    }

    const result = await softAnonymizeProfile(db, user.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Anonymization failed' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message:
        'A profil adatai anonimizálva lettek (DEMO soft-delete). A bejelentkezési fiók továbbra is létezik teszt célokra.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Delete failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
