import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { siteConfig } from '@/lib/seo';

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

const STATIC_PATHS: Array<{ path: string; priority?: number; changeFreq?: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/', priority: 1, changeFreq: 'daily' },
  { path: '/browse', priority: 0.9, changeFreq: 'hourly' },
  { path: '/legal/terms', priority: 0.2, changeFreq: 'yearly' },
  { path: '/legal/privacy', priority: 0.2, changeFreq: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority, changeFreq }) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: now,
    changeFrequency: changeFreq,
    priority,
  }));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return entries;
  }

  try {
    const client = createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: products } = await client
      .from('products')
      .select('id, updated_at, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (products) {
      for (const p of products) {
        entries.push({
          url: `${siteConfig.url}/products/${p.id}`,
          lastModified: new Date(p.updated_at || p.created_at || now),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    console.warn('[sitemap] product fetch failed', error);
  }

  return entries;
}
