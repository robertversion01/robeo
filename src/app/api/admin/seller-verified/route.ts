import { NextRequest, NextResponse } from 'next/server';
import { assertAdminRequest } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function escapeIlike(raw: string): string {
  return raw.replace(/[%_\\]/g, '\\$&');
}

/** Admin: eladók seller_verified státusza (role-alapú auth). */
export async function GET(req: NextRequest) {
  try {
    const admin = await assertAdminRequest(req);
    if (!admin.ok) return admin.res;

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Missing Supabase service role configuration' }, { status: 500 });
    }

    const q = req.nextUrl.searchParams.get('q')?.trim() || '';
    let query = db
      .from('profiles')
      .select('id, email, full_name, seller_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(80);

    if (q.length >= 2) {
      const escaped = escapeIlike(q);
      query = query.or(`email.ilike.%${escaped}%,full_name.ilike.%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) {
      if (/seller_verified/i.test(error.message)) {
        return NextResponse.json(
          { error: 'seller_verified oszlop hiányzik — futtasd: patch-products-marketplace-columns.sql' },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, profiles: data || [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'List failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Admin: seller_verified be/ki (profile id alapján). */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await assertAdminRequest(req);
    if (!admin.ok) return admin.res;

    const body = (await req.json()) as { profileId?: string; sellerVerified?: boolean };
    const { profileId, sellerVerified } = body;

    if (!profileId || typeof sellerVerified !== 'boolean') {
      return NextResponse.json({ error: 'profileId and sellerVerified (boolean) required' }, { status: 400 });
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Missing Supabase service role configuration' }, { status: 500 });
    }

    const { data, error } = await db
      .from('profiles')
      .update({ seller_verified: sellerVerified })
      .eq('id', profileId)
      .select('id, email, full_name, seller_verified')
      .maybeSingle();

    if (error) {
      if (/seller_verified/i.test(error.message)) {
        return NextResponse.json(
          { error: 'seller_verified oszlop hiányzik — futtasd: patch-products-marketplace-columns.sql' },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, profile: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
