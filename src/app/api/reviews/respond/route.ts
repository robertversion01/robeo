import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function authUserId(req: NextRequest): Promise<string | null> {
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
  const userId = await authUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    reviewId?: unknown;
    response?: unknown;
  } | null;
  const reviewId = typeof body?.reviewId === 'string' ? body.reviewId : '';
  if (!reviewId) {
    return NextResponse.json({ error: 'reviewId required' }, { status: 400 });
  }
  const responseText =
    typeof body?.response === 'string' ? body.response.trim().slice(0, 500) : '';

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  // Csak a megertekelt elado valaszolhat — nem modosithatja a rating/comment mezot.
  const { data: review, error: fetchErr } = await db
    .from('reviews')
    .select('id, reviewed_id')
    .eq('id', reviewId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!review) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if ((review as { reviewed_id: string }).reviewed_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error: updErr } = await db
    .from('reviews')
    .update({
      seller_response: responseText || null,
      seller_response_at: responseText ? new Date().toISOString() : null,
    })
    .eq('id', reviewId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    seller_response: responseText || null,
    seller_response_at: responseText ? new Date().toISOString() : null,
  });
}
