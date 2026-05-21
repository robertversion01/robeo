import { NextRequest, NextResponse } from 'next/server';
import { assertAdminRequest } from '@/lib/adminAuth';
import { dac7ReportToCsv, fetchDac7FlaggedSellers } from '@/lib/dac7Report';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await assertAdminRequest(req);
  if (!auth.ok) return auth.res;

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  try {
    const rows = await fetchDac7FlaggedSellers(db);
    const format = req.nextUrl.searchParams.get('format');

    if (format === 'csv') {
      const csv = dac7ReportToCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="robeo-dac7-report-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      count: rows.length,
      sellers: rows,
      generatedAt: new Date().toISOString(),
      demoMode: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'DAC7 report failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
