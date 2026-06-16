import { NextRequest, NextResponse } from 'next/server';
import { assertAdminRequest } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const FUNNEL_EVENTS = [
  'product_view',
  'offer_sent',
  'message_sent',
  'listing_created',
  'signup_completed',
  'feedback_submitted',
] as const;

function isMissingTable(message?: string | null): boolean {
  return Boolean(message && /relation .* does not exist|could not find the table/i.test(message));
}

export async function GET(req: NextRequest) {
  const admin = await assertAdminRequest(req);
  if (!admin.ok) return admin.res;

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Funnel: esemenynkenti darabszam (osszes + utolso 7 nap).
  const funnel: { name: string; total: number; last7d: number }[] = [];
  let schemaMissing = false;

  for (const name of FUNNEL_EVENTS) {
    const totalRes = await db
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('name', name);
    if (totalRes.error) {
      if (isMissingTable(totalRes.error.message)) schemaMissing = true;
      funnel.push({ name, total: 0, last7d: 0 });
      continue;
    }
    const recentRes = await db
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('name', name)
      .gte('created_at', sinceIso);
    funnel.push({
      name,
      total: totalRes.count ?? 0,
      last7d: recentRes.count ?? 0,
    });
  }

  const feedbackRes = await db
    .from('feedback')
    .select('id, type, message, path, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const errorsRes = await db
    .from('error_logs')
    .select('id, message, source, path, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (isMissingTable(feedbackRes.error?.message) || isMissingTable(errorsRes.error?.message)) {
    schemaMissing = true;
  }

  return NextResponse.json({
    funnel,
    feedback: feedbackRes.data ?? [],
    errors: errorsRes.data ?? [],
    schemaMissing,
  });
}
