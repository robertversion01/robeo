import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const DEMO_IMAGE_POOLS: Record<string, string[]> = {
  clothing: [
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=80',
  ],
  shoes: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=80',
  ],
  accessories: [
    'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80',
  ],
  other: [
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
  ],
};

function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(' ')) return false;
  return /^https?:\/\/.+/i.test(trimmed);
}

function sanitizeImages(imageUrl: unknown, images: unknown): string[] {
  const cleaned: string[] = [];

  if (Array.isArray(images)) {
    for (const image of images) {
      if (isValidUrl(image)) {
        const normalized = image.trim();
        if (!cleaned.includes(normalized)) cleaned.push(normalized);
      }
    }
  }

  if (isValidUrl(imageUrl)) {
    const normalizedMain = imageUrl.trim();
    if (!cleaned.includes(normalizedMain)) {
      cleaned.unshift(normalizedMain);
    }
  }

  return cleaned;
}

function fillMissingImages(category: unknown, current: string[], seedNumber: number): string[] {
  const targetCount = 4;
  const key = category === 'shoes' || category === 'clothing' || category === 'accessories' ? category : 'other';
  const pool = DEMO_IMAGE_POOLS[key];
  const merged = [...current];

  let idx = seedNumber % pool.length;
  while (merged.length < targetCount) {
    const candidate = pool[idx % pool.length];
    if (!merged.includes(candidate)) merged.push(candidate);
    idx += 1;
  }

  return merged;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { userEmail?: string };
    const userEmail = body.userEmail || '';

    if (userEmail !== 'hevesi.tr@gmail.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase service role configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, category, image_url, images')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    let fixed = 0;
    let inspected = 0;

    for (const [index, product] of (products || []).entries()) {
      inspected += 1;
      const sanitized = sanitizeImages(product.image_url, product.images);
      if (sanitized.length >= 3) continue;

      const replaced = fillMissingImages(product.category, sanitized, index);
      const nextMain = replaced[0] || null;

      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: nextMain, images: replaced })
        .eq('id', product.id);

      if (!updateError) {
        fixed += 1;
      } else {
        console.error('[admin-image-audit] update failed', {
          productId: product.id,
          name: product.name,
          error: updateError.message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      inspected,
      fixed,
      unchanged: inspected - fixed,
    });
  } catch (error: any) {
    console.error('[admin-image-audit] error', error);
    return NextResponse.json(
      { error: error?.message || 'Unexpected image audit error' },
      { status: 500 }
    );
  }
}
