import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DEMO_IMAGE_POOLS = {
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

function readEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return {};

  const raw = readFileSync(envPath, 'utf8');
  const out = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    out[key] = value;
  }

  return out;
}

function isValidUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes(' ')) return false;
  return /^https?:\/\/.+/i.test(trimmed);
}

function sanitizeImages(imageUrl, images) {
  const cleaned = [];
  if (Array.isArray(images)) {
    for (const item of images) {
      if (isValidUrl(item)) {
        const normalized = item.trim();
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

function getCategoryPool(category) {
  if (category === 'shoes') return DEMO_IMAGE_POOLS.shoes;
  if (category === 'clothing') return DEMO_IMAGE_POOLS.clothing;
  if (category === 'accessories') return DEMO_IMAGE_POOLS.accessories;
  return DEMO_IMAGE_POOLS.other;
}

function fillMissingImages(category, current, seedNumber) {
  const targetCount = 4;
  const pool = getCategoryPool(category);
  const merged = [...current];

  let poolIndex = seedNumber % pool.length;
  while (merged.length < targetCount) {
    const candidate = pool[poolIndex % pool.length];
    if (!merged.includes(candidate)) merged.push(candidate);
    poolIndex += 1;
  }

  return merged;
}

async function main() {
  const envFromFile = readEnvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envFromFile.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envFromFile.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envFromFile.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseKey = serviceRoleKey || anonKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, category, image_url, images')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) throw new Error(error.message);
  if (!products || products.length === 0) {
    console.info('[fix-product-images] No products found.');
    return;
  }

  let inspected = 0;
  let fixed = 0;

  for (const [index, product] of products.entries()) {
    inspected += 1;

    const sanitized = sanitizeImages(product.image_url, product.images);
    const hasMinimumImages = sanitized.length >= 3;
    const shouldFix = !hasMinimumImages;

    if (!shouldFix) continue;

    const replaced = fillMissingImages(product.category, sanitized, index);
    const nextMain = replaced[0] || null;

    const { error: updateError } = await supabase
      .from('products')
      .update({
        image_url: nextMain,
        images: replaced,
      })
      .eq('id', product.id);

    if (updateError) {
      console.error('[fix-product-images] Update failed', {
        productId: product.id,
        name: product.name,
        updateError: updateError.message,
      });
      continue;
    }

    fixed += 1;
    console.info('[fix-product-images] Updated product images', {
      productId: product.id,
      name: product.name,
      imageCount: replaced.length,
    });
  }

  console.info('[fix-product-images] Completed', {
    inspected,
    fixed,
    unchanged: inspected - fixed,
  });
}

main().catch((err) => {
  console.error('[fix-product-images] failed:', err.message || err);
  process.exit(1);
});
