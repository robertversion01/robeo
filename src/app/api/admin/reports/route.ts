import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAIL } from '@/lib/stripeConnect';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function assertAdmin(req: NextRequest): Promise<{ ok: true; userId: string } | { ok: false; res: NextResponse }> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, res: NextResponse.json({ error: 'Auth config missing' }, { status: 500 }) };
  }

  const authClient = createClient(url, anon);
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user?.email) {
    return { ok: false, res: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }

  if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, userId: user.id };
}

export async function GET(req: NextRequest) {
  const admin = await assertAdmin(req);
  if (!admin.ok) return admin.res;

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const { data: reports, error } = await db
    .from('reports')
    .select(
      'id, product_id, reporter_id, reason, details, status, created_at, products(id, name, image_url, user_id, status)',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: reports || [] });
}

export async function PATCH(req: NextRequest) {
  const admin = await assertAdmin(req);
  if (!admin.ok) return admin.res;

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const body = await req.json();
  const { reportId, action, productId } = body as {
    reportId?: string;
    action?: 'dismiss' | 'delete_product';
    productId?: string;
  };

  if (!reportId || !action) {
    return NextResponse.json({ error: 'reportId and action required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (action === 'delete_product') {
    const pid = productId;
    if (!pid) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }
    const { error: prodErr } = await db
      .from('products')
      .update({ status: 'deleted' })
      .eq('id', pid);
    if (prodErr) {
      return NextResponse.json({ error: prodErr.message }, { status: 500 });
    }
  }

  const { error: reportErr } = await db
    .from('reports')
    .update({
      status: action === 'dismiss' ? 'dismissed' : 'actioned',
      resolved_at: now,
      resolved_by: admin.userId,
    })
    .eq('id', reportId);

  if (reportErr) {
    return NextResponse.json({ error: reportErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
