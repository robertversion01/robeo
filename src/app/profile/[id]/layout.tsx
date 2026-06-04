import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { buildPageMetadata, siteConfig } from '@/lib/seo';

async function loadSeller(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return null;

  const client = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await client
    .from('profiles')
    .select('id, full_name, name, bio, avatar_url, email')
    .eq('id', id)
    .maybeSingle();

  return data as {
    id: string;
    full_name?: string | null;
    name?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  } | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const seller = await loadSeller(id);
  const path = `/profile/${id}`;

  if (!seller) {
    return buildPageMetadata({
      title: `Eladó | ${siteConfig.name}`,
      description: 'Az eladó profil nem található.',
      path,
      noIndex: true,
    });
  }

  const displayName =
    seller.full_name?.trim() ||
    seller.name?.trim() ||
    seller.email?.split('@')[0] ||
    'Eladó';

  const title = `${displayName} szekrénye | ${siteConfig.name}`;
  const description =
    (seller.bio || '').slice(0, 160) ||
    `Nézd meg ${displayName} termékeit a ROBEO piacterén — biztonságos vásárlás, vevővédelem.`;

  return buildPageMetadata({
    title,
    description,
    path,
    image: seller.avatar_url || undefined,
  });
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
