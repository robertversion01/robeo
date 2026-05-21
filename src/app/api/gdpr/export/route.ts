import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildGdprExportBundle } from '@/lib/gdprExport';
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

    const db = getSupabaseAdminClient() ?? authClient;
    const bundle = await buildGdprExportBundle(db, user.id);

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="robeo-gdpr-export-${user.id.slice(0, 8)}.json"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Export failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
