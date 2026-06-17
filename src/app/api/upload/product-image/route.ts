import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Vercel serverless request body limit ~4.5 MB — maradjunk alatta. */
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

function extForType(type: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}

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

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 4 MB on server upload)' }, { status: 400 });
    }

    const contentType = file.type || 'image/jpeg';
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    const ext = extForType(contentType);
    const objectPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await db.storage.from('product-images').upload(objectPath, buffer, {
      contentType,
      upsert: false,
      cacheControl: '31536000, immutable',
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: pub } = db.storage.from('product-images').getPublicUrl(objectPath);
    return NextResponse.json({ ok: true, path: objectPath, publicUrl: pub.publicUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
