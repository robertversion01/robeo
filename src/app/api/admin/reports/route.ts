import { NextRequest, NextResponse } from 'next/server';
import { assertAdminRequest } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await assertAdminRequest(req);
  if (!admin.ok) return admin.res;

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const statusFilter = req.nextUrl.searchParams.get('status') || 'pending';

  let query = db
    .from('reports')
    .select(
      'id, product_id, reporter_id, reason, details, status, created_at, resolved_at, products(id, name, image_url, user_id, status)',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: reports, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = reports || [];
  const reporterIds = [...new Set(rows.map((r) => String((r as { reporter_id: string }).reporter_id)))];
  let reporterMap: Record<string, { email: string | null; full_name: string | null }> = {};

  if (reporterIds.length > 0) {
    const { data: reporters } = await db
      .from('profiles')
      .select('id, email, full_name, name')
      .in('id', reporterIds);

    for (const p of reporters || []) {
      const row = p as { id: string; email: string | null; full_name: string | null; name: string | null };
      reporterMap[row.id] = {
        email: row.email,
        full_name: row.full_name || row.name,
      };
    }
  }

  const enriched = rows.map((r) => {
    const row = r as { reporter_id: string };
    return {
      ...r,
      reporter: reporterMap[row.reporter_id] || null,
    };
  });

  return NextResponse.json({
    reports: enriched,
    pendingCount: enriched.filter((r) => (r as { status: string }).status === 'pending').length,
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await assertAdminRequest(req);
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

  const reportStatus = action === 'dismiss' ? 'dismissed' : 'actioned';

  const { error: reportErr } = await db
    .from('reports')
    .update({
      status: reportStatus,
      resolved_at: now,
      resolved_by: admin.userId,
    })
    .eq('id', reportId);

  if (reportErr) {
    return NextResponse.json({ error: reportErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: reportStatus });
}
