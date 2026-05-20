import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

/** Közös health válasz — /api/health/marketplace és /api/marketplace-health */
export async function getMarketplaceHealthResponse() {
  const admin = getSupabaseAdminClient();
  const hasCron = Boolean(process.env.CRON_SECRET);
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasPublicSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  let adminDb = false;
  let priceSnapshotsTable = false;
  let followerTriggerHint = 'unknown';

  if (admin) {
    const products = await admin.from('products').select('id').limit(1);
    adminDb = !products.error;

    const snaps = await admin.from('product_price_snapshots').select('id').limit(1);
    priceSnapshotsTable = !snaps.error;

    followerTriggerHint = priceSnapshotsTable
      ? 'patch likely applied (price_snapshots + trigger in patch-marketplace-round2.sql)'
      : 'run supabase/patch-marketplace-round2.sql';
  }

  return NextResponse.json({
    ok: hasServiceRole && adminDb,
    env: {
      cronSecret: hasCron,
      serviceRole: hasServiceRole,
      publicSupabase: hasPublicSupabase,
      ollamaUrlConfigured: Boolean(process.env.NEXT_PUBLIC_OLLAMA_URL),
    },
    database: {
      adminClient: adminDb,
      product_price_snapshots: priceSnapshotsTable,
      follower_new_listing: followerTriggerHint,
    },
    workers: {
      savedSearchScan: '/api/workers/saved-search-scan',
      priceWatchScan: '/api/workers/price-watch-scan',
      cronSchedule: '0 * * * * (vercel.json)',
    },
    deployNote:
      'Upload AI (Ollama) csak lokálisan működik a böngészőből; élesben szerver OLLAMA_URL kell.',
    timestamp: new Date().toISOString(),
  });
}
