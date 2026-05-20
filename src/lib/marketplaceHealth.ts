import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import {
  GITHUB_CRON_SAVED_SEARCH_LABEL,
  VERCEL_CRON_SAVED_SEARCH,
  VERCEL_CRON_SAVED_SEARCH_LABEL,
} from '@/lib/cronSchedules';
import { productsHasSizeColumn } from '@/lib/productSchema';

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
  let productsSizeColumn = false;
  let followerTriggerHint = 'unknown';

  if (admin) {
    const products = await admin.from('products').select('id').limit(1);
    adminDb = !products.error;

    productsSizeColumn = await productsHasSizeColumn(admin);

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
      products_size: productsSizeColumn,
      product_price_snapshots: priceSnapshotsTable,
      follower_new_listing: followerTriggerHint,
      products_size_patch: productsSizeColumn
        ? 'ok'
        : 'run supabase/patch-products-marketplace-columns.sql',
    },
    workers: {
      savedSearchScan: '/api/workers/saved-search-scan',
      priceWatchScan: '/api/workers/price-watch-scan',
      cronSchedule: {
        vercel: `${VERCEL_CRON_SAVED_SEARCH} (${VERCEL_CRON_SAVED_SEARCH_LABEL})`,
        githubActions: GITHUB_CRON_SAVED_SEARCH_LABEL,
      },
    },
    deployNote:
      'Upload AI (Ollama) csak lokálisan működik a böngészőből; élesben szerver OLLAMA_URL kell.',
    timestamp: new Date().toISOString(),
  });
}
