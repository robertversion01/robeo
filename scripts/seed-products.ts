import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

type SeedProduct = {
  name: string;
  description: string;
  category: 'clothing' | 'shoes' | 'accessories' | 'electronics' | 'other';
  brand: string;
  condition: 'new' | 'excellent' | 'good';
  price: number;
  images: string[];
  featured_until: string | null;
};

function readEnvLocal(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return {};
  const raw = readFileSync(envPath, 'utf8');
  const out: Record<string, string> = {};

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

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

function buildSeedProducts(): SeedProduct[] {
  const imageSets: string[][] = [
    [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=1200&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1583744946564-b52d01a7b321?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1528701800489-20be9c9f5d90?auto=format&fit=crop&w=1200&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
    ],
  ];

  const names = [
    'Ferfi cipo - Nike Air Max 270',
    'Noi ruha - Zara midi',
    'Gyerekjatek - fa epito keszlet',
    'Kiegeszitok - bor oldaltaska',
    'Ferfi pulover - H&M',
    'Noi cipo - Adidas Superstar',
    'Gyerekjatek - pluss maci',
    'Kiegeszitok - ezust nyaklanc',
    'Ferfi cipo - New Balance 574',
    'Noi ruha - Mango nyari',
    'Gyerekjatek - lego city',
    'Kiegeszitok - napszemuveg',
    'Ferfi kabat - Reserved',
    'Noi cipo - Puma Cali',
    'Gyerekjatek - kirako',
    'Kiegeszitok - hatizsak',
    'Ferfi polo - Lacoste',
    'Noi ruha - elegans mini',
    'Gyerekjatek - taviranyitos auto',
    'Kiegeszitok - oran',
    'Ferfi cipo - Converse Chuck',
    'Noi cipo - Vans Old Skool',
    'Gyerekjatek - kreativ festo szett',
    'Kiegeszitok - baseball sapka',
    'Ferfi farmer - Levis 501',
    'Noi ruha - boho maxi',
    'Gyerekjatek - memory kartya',
    'Kiegeszitok - bor penztarca',
    'Ferfi cipo - Asics Gel',
    'Noi cipo - Reebok Club C',
  ];

  const conditions: Array<'new' | 'excellent' | 'good'> = ['new', 'excellent', 'good'];
  const brands = ['Nike', 'Adidas', 'Zara', 'H&M', 'Mango', 'Puma', 'New Balance', 'Converse', 'Reebok', 'Levis'];

  return names.map((name, idx) => {
    const category = name.toLowerCase().includes('cipo')
      ? 'shoes'
      : name.toLowerCase().includes('ruha') || name.toLowerCase().includes('pulover') || name.toLowerCase().includes('polo') || name.toLowerCase().includes('farmer') || name.toLowerCase().includes('kabat')
        ? 'clothing'
        : name.toLowerCase().includes('jatek')
          ? 'other'
          : 'accessories';

    const isFeatured = idx % 4 === 0;
    const featuredUntil = isFeatured
      ? new Date(Date.now() + (3 + (idx % 5)) * 24 * 60 * 60 * 1000).toISOString()
      : null;

    return {
      name,
      description: `${name} demó hirdetés teszteléshez. Megkímélt állapot, valósághű tesztadat.`,
      category,
      brand: brands[idx % brands.length],
      condition: conditions[idx % conditions.length],
      price: 1000 + (idx * 1700) % 49000,
      images: imageSets[idx % imageSets.length],
      featured_until: featuredUntil,
    };
  });
}

async function main() {
  const envFromFile = readEnvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envFromFile.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envFromFile.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envFromFile.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseKey = serviceRoleKey || anonKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (profileError || !profileRow?.id) {
    throw new Error(`No profile found to assign seeded products. ${profileError?.message || ''}`.trim());
  }

  const ownerId = profileRow.id as string;
  const seedProducts = buildSeedProducts().map((item) => ({
    ...item,
    user_id: ownerId,
    image_url: item.images[0] || null,
    status: 'active',
    images: item.images,
  }));

  for (const group of chunk(seedProducts, 10)) {
    const { error } = await supabase.from('products').insert(group);
    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }
  }

  const featuredCount = seedProducts.filter((item) => item.featured_until).length;
  console.info(`Seed completed: ${seedProducts.length} products inserted (${featuredCount} featured).`);
}

main().catch((error) => {
  console.error('[seed-products] failed:', error.message || error);
  process.exit(1);
});

