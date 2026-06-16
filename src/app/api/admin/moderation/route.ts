import { NextRequest, NextResponse } from 'next/server';
import { assertAdminRequest } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type OffenderCounts = {
  listingReports: number;
  userReports: number;
  disputes: number;
};

async function safeProfiles(
  db: SupabaseClient,
  ids: string[],
): Promise<Record<string, { name: string | null; email: string | null }>> {
  const map: Record<string, { name: string | null; email: string | null }> = {};
  if (ids.length === 0) return map;
  const { data } = await db
    .from('profiles')
    .select('id, email, full_name, name')
    .in('id', ids);
  for (const p of data || []) {
    const row = p as { id: string; email: string | null; full_name: string | null; name: string | null };
    map[row.id] = { name: row.full_name || row.name, email: row.email };
  }
  return map;
}

export async function GET(req: NextRequest) {
  const admin = await assertAdminRequest(req);
  if (!admin.ok) return admin.res;

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const statusFilter = req.nextUrl.searchParams.get('status') || 'pending';
  let userReportsSchemaMissing = false;

  // 1) Felhasznalo-jelentesek
  let userReportRows: Array<{
    id: string;
    reporter_id: string;
    reported_id: string;
    context: string;
    reason: string;
    details: string | null;
    status: string;
    created_at: string;
  }> = [];

  {
    let q = db
      .from('user_reports')
      .select('id, reporter_id, reported_id, context, reason, details, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data, error } = await q;
    if (error) {
      userReportsSchemaMissing = true;
    } else {
      userReportRows = (data || []) as typeof userReportRows;
    }
  }

  // 2) Repeat offenders aggregalas (termek-report + user-report + dispute)
  const offenders: Record<string, OffenderCounts> = {};
  const bump = (id: string | null | undefined, key: keyof OffenderCounts) => {
    if (!id) return;
    if (!offenders[id]) offenders[id] = { listingReports: 0, userReports: 0, disputes: 0 };
    offenders[id][key] += 1;
  };

  // termek-jelentesek -> termek tulajdonosa
  {
    const { data } = await db
      .from('reports')
      .select('id, products(user_id)')
      .limit(1000);
    for (const r of data || []) {
      const prod = (r as { products: unknown }).products;
      const owner = (Array.isArray(prod) ? prod[0] : prod) as { user_id?: string } | null;
      bump(owner?.user_id, 'listingReports');
    }
  }

  // felhasznalo-jelentesek -> reported_id
  if (!userReportsSchemaMissing) {
    const { data } = await db.from('user_reports').select('reported_id').limit(1000);
    for (const r of data || []) {
      bump((r as { reported_id?: string }).reported_id, 'userReports');
    }
  }

  // vitatasok -> elado
  {
    const { data } = await db
      .from('disputes')
      .select('id, transactions(seller_id)')
      .limit(1000);
    for (const r of data || []) {
      const tx = (r as { transactions: unknown }).transactions;
      const seller = (Array.isArray(tx) ? tx[0] : tx) as { seller_id?: string } | null;
      bump(seller?.seller_id, 'disputes');
    }
  }

  const repeatOffenderIds = Object.entries(offenders)
    .map(([id, c]) => ({ id, ...c, total: c.listingReports + c.userReports + c.disputes }))
    .filter((o) => o.total >= 2)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  // Profil nevek osszegyujtese
  const idsToResolve = new Set<string>();
  repeatOffenderIds.forEach((o) => idsToResolve.add(o.id));
  userReportRows.forEach((r) => {
    idsToResolve.add(r.reporter_id);
    idsToResolve.add(r.reported_id);
  });
  const profileMap = await safeProfiles(db, [...idsToResolve]);

  return NextResponse.json({
    schemaMissing: userReportsSchemaMissing,
    userReports: userReportRows.map((r) => ({
      ...r,
      reporter: profileMap[r.reporter_id] || null,
      reported: profileMap[r.reported_id] || null,
    })),
    repeatOffenders: repeatOffenderIds.map((o) => ({
      ...o,
      profile: profileMap[o.id] || null,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await assertAdminRequest(req);
  if (!admin.ok) return admin.res;

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as {
    reportId?: string;
    action?: 'dismiss' | 'actioned';
  } | null;

  const reportId = body?.reportId;
  const action = body?.action;
  if (!reportId || !action) {
    return NextResponse.json({ error: 'reportId and action required' }, { status: 400 });
  }

  const status = action === 'dismiss' ? 'dismissed' : 'actioned';
  const { error } = await db
    .from('user_reports')
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: admin.userId })
    .eq('id', reportId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status });
}
