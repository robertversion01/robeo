import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyFollowersOfNewProduct } from '@/lib/followerNewItemNotify';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: 'Auth config missing' }, { status: 500 });
    }

    const authClient = createClient(url, anon);
    const {
      data: { user },
    } = await authClient.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await req.json();
    const { productId } = body as { productId?: string };
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Service role required' }, { status: 500 });
    }

    const { data: product, error: prodErr } = await db
      .from('products')
      .select('id, name, user_id, status')
      .eq('id', productId)
      .maybeSingle();

    if (prodErr || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await notifyFollowersOfNewProduct(db, {
      productId: product.id,
      sellerId: product.user_id,
      productName: product.name,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'notify failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
