import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['bug', 'idea', 'praise', 'other'] as const;

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
      type?: unknown;
      message?: unknown;
      path?: unknown;
    };

    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';
    if (message.length < 3) {
      return NextResponse.json({ error: 'message_too_short' }, { status: 400 });
    }

    const type =
      typeof body.type === 'string' && (ALLOWED_TYPES as readonly string[]).includes(body.type)
        ? body.type
        : 'other';

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
    }

    const userId = await optionalUserId(req);

    const { error } = await db.from('feedback').insert({
      user_id: userId,
      type,
      message,
      path: typeof body.path === 'string' ? body.path.slice(0, 300) : null,
    });

    if (error) {
      const status = /relation .* does not exist/i.test(error.message) ? 503 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
}
