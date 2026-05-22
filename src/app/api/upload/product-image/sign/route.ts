import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(req: NextRequest) {
  try {
    const user = await authUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json(
        {
          error:
            'Service role required. Set SUPABASE_SERVICE_ROLE_KEY on Vercel (Production + Preview).',
        },
        { status: 500 },
      );
    }

    const body = (await req.json()) as { contentType?: string; ext?: string };
    const contentType = body.contentType?.trim() || 'image/jpeg';
    const ext = body.ext?.trim() || 'jpg';

    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    const objectPath = `${user.id}/${crypto.randomUUID()}.${ext.replace(/^\./, '')}`;
    const { data, error } = await db.storage.from('product-images').createSignedUploadUrl(objectPath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'sign failed' }, { status: 500 });
    }

    const { data: pub } = db.storage.from('product-images').getPublicUrl(objectPath);
    return NextResponse.json({
      ok: true,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: pub.publicUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'sign failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
