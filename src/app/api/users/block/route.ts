import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { blockUser, unblockUser } from '@/lib/userBlocks';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function authUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const authClient = createClient(url, anon);
  const {
    data: { user },
  } = await authClient.auth.getUser(token);
  return user;
}

export async function POST(req: NextRequest) {
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as { blockedUserId?: string };
  const blockedUserId = body.blockedUserId?.trim();
  if (!blockedUserId) {
    return NextResponse.json({ error: 'blockedUserId required' }, { status: 400 });
  }

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  const result = await blockUser(db, user.id, blockedUserId);
  if (!result.ok) {
    const status = result.error === 'schema_missing' ? 503 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const blockedUserId = req.nextUrl.searchParams.get('userId')?.trim();
  if (!blockedUserId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  const result = await unblockUser(db, user.id, blockedUserId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
