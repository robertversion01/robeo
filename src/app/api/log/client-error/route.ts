import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function optionalUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    const authClient = createClient(url, anon);
    const {
      data: { user },
    } = await authClient.auth.getUser(token);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message?: unknown;
      stack?: unknown;
      source?: unknown;
      path?: unknown;
    };

    const message = typeof body.message === 'string' ? body.message.slice(0, 500) : '';
    if (!message) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ ok: false });
    }

    const userId = await optionalUserId(req);

    const { error } = await db.from('error_logs').insert({
      user_id: userId,
      message,
      stack: typeof body.stack === 'string' ? body.stack.slice(0, 4000) : null,
      source: typeof body.source === 'string' ? body.source.slice(0, 40) : null,
      path: typeof body.path === 'string' ? body.path.slice(0, 300) : null,
      user_agent: (req.headers.get('user-agent') || '').slice(0, 300) || null,
    });

    if (error) {
      return NextResponse.json({ ok: false });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
