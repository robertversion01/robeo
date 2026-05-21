import type { SupabaseClient } from '@supabase/supabase-js';

export type PromoteAnalyticsRow = {
  productId: string;
  name: string;
  imageUrl: string | null;
  featuredUntil: string | null;
  isActive: boolean;
  demoViews: number;
  demoClicks: number;
  lastBoostedAt: string | null;
  estimatedCtr: number;
};

export async function fetchSellerPromoteAnalytics(
  db: SupabaseClient,
  sellerId: string,
): Promise<{
  rows: PromoteAnalyticsRow[];
  totals: { activeBoosts: number; totalViews: number; totalClicks: number };
}> {
  const { data, error } = await db
    .from('products')
    .select(
      'id, name, image_url, featured_until, promote_demo_views, promote_demo_clicks, promote_last_boosted_at',
    )
    .eq('user_id', sellerId)
    .order('featured_until', { ascending: false, nullsFirst: false });

  if (error) {
    console.warn('[promoteAnalytics]', error.message);
    return { rows: [], totals: { activeBoosts: 0, totalViews: 0, totalClicks: 0 } };
  }

  const now = Date.now();
  const rows: PromoteAnalyticsRow[] = (data || []).map((p) => {
    const featuredUntil = (p.featured_until as string) ?? null;
    const isActive = featuredUntil ? new Date(featuredUntil).getTime() > now : false;
    const views = Math.round(Number(p.promote_demo_views) || 0);
    const clicks = Math.round(Number(p.promote_demo_clicks) || 0);
    const ctr = views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0;
    return {
      productId: p.id as string,
      name: (p.name as string) || 'Termék',
      imageUrl: (p.image_url as string) ?? null,
      featuredUntil,
      isActive,
      demoViews: views,
      demoClicks: clicks,
      lastBoostedAt: (p.promote_last_boosted_at as string) ?? null,
      estimatedCtr: ctr,
    };
  });

  const boosted = rows.filter((r) => r.featuredUntil || r.demoViews > 0);
  const activeBoosts = rows.filter((r) => r.isActive).length;
  const totalViews = boosted.reduce((s, r) => s + r.demoViews, 0);
  const totalClicks = boosted.reduce((s, r) => s + r.demoClicks, 0);

  return {
    rows: boosted.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return b.demoViews - a.demoViews;
    }),
    totals: { activeBoosts, totalViews, totalClicks },
  };
}

export async function recordPromoteDemoView(
  db: SupabaseClient,
  productId: string,
): Promise<void> {
  const { data: row } = await db
    .from('products')
    .select('promote_demo_views, featured_until')
    .eq('id', productId)
    .maybeSingle();

  if (!row?.featured_until) return;
  const until = new Date(row.featured_until as string).getTime();
  if (until <= Date.now()) return;

  const views = Math.round(Number(row.promote_demo_views) || 0) + 1;
  await db.from('products').update({ promote_demo_views: views }).eq('id', productId);
}

/** Kiemelés aktiválásakor (Stripe webhook / admin) — demo számlálók induló értéke */
export function promoteBoostSeedMetrics(): { views: number; clicks: number } {
  const views = 12 + Math.floor(Math.random() * 38);
  const clicks = Math.max(1, Math.floor(views * (0.06 + Math.random() * 0.06)));
  return { views, clicks };
}

export async function markProductPromoteBoosted(
  db: SupabaseClient,
  productId: string,
  featuredUntil: string,
): Promise<void> {
  const { views, clicks } = promoteBoostSeedMetrics();
  const { error } = await db
    .from('products')
    .update({
      featured_until: featuredUntil,
      promote_last_boosted_at: new Date().toISOString(),
      promote_demo_views: views,
      promote_demo_clicks: clicks,
    })
    .eq('id', productId);

  if (error) {
    console.warn('[promoteAnalytics] markProductPromoteBoosted', error.message);
  }
}

export async function recordPromoteDemoClick(
  db: SupabaseClient,
  productId: string,
): Promise<void> {
  const { data: row } = await db
    .from('products')
    .select('promote_demo_clicks, featured_until')
    .eq('id', productId)
    .maybeSingle();

  if (!row?.featured_until) return;

  const clicks = Math.round(Number(row.promote_demo_clicks) || 0) + 1;
  await db.from('products').update({ promote_demo_clicks: clicks }).eq('id', productId);
}
