/**
 * Teljes marketplace nullázás — minden felhasználói tartalom törlése.
 * Auth userek + profiles + wallets sorok megmaradnak (egyenleg nullázva).
 * Seed NEM fut automatikusan.
 *
 * Usage:
 *   node scripts/reset-test-environment.mjs [--dry-run]
 *   npm run reset:test-env
 *   npm run reset:marketplace
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

export const ADMIN_EMAIL = 'hevesi.tr@gmail.com';
export const BUYER_EMAIL = 'robeo.test.buyer@robeo.local';
export const SELLER_EMAIL = 'robeo.test.seller@robeo.local';
export const TEST_PASSWORD = 'RobeoTest2026!';

/** user_metadata — activity / notification / saved search state (forced empty) */
const METADATA_EMPTY = {
  robeo_saved_searches: [],
  robeo_saved_search_worker_state: {},
  robeo_notification_outbox_v1: [],
  robeo_notification_dedupe_v1: {},
  robeo_notification_delivery_v1: {},
  robeo_price_watch_v1: [],
  robeo_web_push_subscriptions_v1: [],
  robeo_user_preferences_v1: {},
};

/**
 * Táblák törlési sorrendje — child → parent (FK-k miatt).
 * Opcionális táblák hiányában skip.
 */
const TABLES_TO_PURGE = [
  { table: 'disputes', dateColumn: 'created_at' },
  { table: 'transaction_line_items', dateColumn: 'created_at' },
  { table: 'invoices', dateColumn: 'created_at' },
  { table: 'wallet_transactions', dateColumn: 'created_at' },
  { table: 'wallet_payouts', dateColumn: 'created_at' },
  { table: 'transactions', dateColumn: 'created_at' },
  { table: 'offers', dateColumn: 'created_at' },
  { table: 'messages', dateColumn: 'created_at' },
  { table: 'favorites', dateColumn: 'created_at' },
  { table: 'reviews', dateColumn: 'created_at' },
  { table: 'reports', dateColumn: 'created_at' },
  { table: 'price_watches', dateColumn: 'created_at' },
  { table: 'product_price_snapshots', dateColumn: 'created_at' },
  { table: 'app_notifications', dateColumn: 'created_at' },
  { table: 'follows', dateColumn: 'created_at' },
  { table: 'stripe_webhook_events', dateColumn: 'received_at', idColumn: 'stripe_event_id' },
  // Legacy séma — ha létezik
  { table: 'shipment_events', dateColumn: 'created_at_utc' },
  { table: 'conversations', dateColumn: 'created_at_utc' },
  { table: 'orders', dateColumn: 'created_at_utc' },
];

const STORAGE_BUCKETS = ['product-images', 'chat-media'];

/** Böngésző localStorage — a script ezeket nem törli, csak emlékeztet. */
const BROWSER_LOCAL_KEYS = [
  'robeo_upload_draft_v2',
  'robeo_upload_draft_v1',
  'robeo_saved_searches_v1',
  'robeo_saved_search_seen_v1',
  'robeo_saved_search_new_counts_v1',
  'robeo_saved_search_notify_dedupe_v1',
  'robeo_price_drop_notified_v1',
  'robeo_seller_bundle_cart_v1',
  'robeo_sale_popup_consumed_v1',
];

function loadEnv(name) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (v && !process.env[k]) process.env[k] = v;
  }
}

loadEnv('.env.local');

function isMissingTableError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    err?.code === 'PGRST205' ||
    err?.code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('could not find')
  );
}

function isMissingColumnError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return err?.code === '42703' || msg.includes('column') && msg.includes('does not exist');
}

async function countRows(admin, table, filter) {
  try {
    let q = admin.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) {
      if (isMissingTableError(error)) return null;
      throw error;
    }
    return count ?? 0;
  } catch (e) {
    if (isMissingTableError(e)) return null;
    throw e;
  }
}

async function deleteAllRows(admin, config) {
  const { table, dateColumn = 'created_at', idColumn = 'id' } = config;
  const before = await countRows(admin, table);
  if (before === null) {
    console.log(`  [skip] ${table} — table not present`);
    return { table, before: 0, deleted: 0, skipped: true };
  }

  if (before === 0) {
    console.log(`  [ok] ${table} — already empty`);
    return { table, before: 0, deleted: 0, skipped: false };
  }

  if (dryRun) {
    console.log(`  [dry-run] ${table} — would delete ${before} rows`);
    return { table, before, deleted: before, skipped: false };
  }

  // Bulk delete by date column (works for follows, stripe_webhook_events, stb.)
  if (dateColumn) {
    const { error: bulkErr, count } = await admin
      .from(table)
      .delete({ count: 'exact' })
      .gte(dateColumn, '1970-01-01T00:00:00.000Z');
    if (!bulkErr) {
      const deleted = count ?? before;
      console.log(`  [done] ${table} — deleted ${deleted} rows (bulk)`);
      return { table, before, deleted, skipped: false };
    }
    if (!isMissingColumnError(bulkErr)) throw bulkErr;
  }

  // Fallback: batch by id
  let deleted = 0;
  while (true) {
    const { data, error } = await admin.from(table).select(idColumn).limit(400);
    if (error) throw error;
    if (!data?.length) break;

    const ids = data.map((r) => r[idColumn]).filter((id) => id != null);
    if (ids.length) {
      const { error: delErr } = await admin.from(table).delete().in(idColumn, ids);
      if (delErr) throw delErr;
      deleted += ids.length;
    }
    if (data.length < 400) break;
  }

  console.log(`  [done] ${table} — deleted ${deleted} rows`);
  return { table, before, deleted, skipped: false };
}

async function hardDeleteAllProducts(admin) {
  const before = await countRows(admin, 'products');
  if (before === null) {
    console.log('  [skip] products — table not present');
    return { before: 0, deleted: 0 };
  }

  const visible = await countRows(admin, 'products', (q) =>
    q.or('status.eq.active,status.is.null,status.eq.sold'),
  );

  console.log(`  products: ${before} total rows (${visible ?? 0} marketplace-visible before reset)`);

  if (before === 0) {
    console.log('  [ok] products — already empty');
    return { before: 0, deleted: 0 };
  }

  if (dryRun) {
    console.log(`  [dry-run] products — would hard-delete ${before} rows`);
    return { before, deleted: before };
  }

  const { error: bulkErr, count } = await admin
    .from('products')
    .delete({ count: 'exact' })
    .gte('created_at', '1970-01-01T00:00:00.000Z');

  if (!bulkErr) {
    console.log(`  [done] products — hard-deleted ${count ?? before} rows`);
    return { before, deleted: count ?? before };
  }

  if (isMissingColumnError(bulkErr)) {
    let deleted = 0;
    while (true) {
      const { data, error } = await admin.from('products').select('id').limit(400);
      if (error) throw error;
      if (!data?.length) break;
      const ids = data.map((r) => r.id);
      const { error: delErr } = await admin.from('products').delete().in('id', ids);
      if (delErr) throw delErr;
      deleted += ids.length;
      if (data.length < 400) break;
    }
    console.log(`  [done] products — hard-deleted ${deleted} rows`);
    return { before, deleted };
  }

  throw bulkErr;
}

async function resetWallets(admin) {
  const before = await countRows(admin, 'wallets');
  if (before === null) {
    console.log('  [skip] wallets — table not present');
    return;
  }

  if (dryRun) {
    console.log(`  [dry-run] wallets — would zero ${before} wallet row(s)`);
    return;
  }

  const { error } = await admin
    .from('wallets')
    .update({ available_balance: 0, pending_balance: 0, updated_at: new Date().toISOString() })
    .gte('updated_at', '1970-01-01T00:00:00.000Z');

  if (error) throw error;
  console.log(`  [done] wallets — balances reset for ${before} user(s)`);
}

async function listStoragePaths(admin, bucket, prefix = '') {
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    if (String(error.message || '').toLowerCase().includes('not found')) return [];
    throw error;
  }

  const paths = [];
  for (const item of data || []) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) {
      paths.push(itemPath);
    } else {
      paths.push(...(await listStoragePaths(admin, bucket, itemPath)));
    }
  }
  return paths;
}

async function emptyStorageBucket(admin, bucket) {
  let paths = [];
  try {
    paths = await listStoragePaths(admin, bucket);
  } catch (e) {
    const msg = String(e?.message || e || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('bucket')) {
      console.log(`  [skip] storage/${bucket} — bucket not present`);
      return;
    }
    throw e;
  }

  if (paths.length === 0) {
    console.log(`  [ok] storage/${bucket} — already empty`);
    return;
  }

  if (dryRun) {
    console.log(`  [dry-run] storage/${bucket} — would delete ${paths.length} object(s)`);
    return;
  }

  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { error } = await admin.storage.from(bucket).remove(chunk);
    if (error) throw error;
  }
  console.log(`  [done] storage/${bucket} — removed ${paths.length} object(s)`);
}

async function resetAllUserMetadata(admin) {
  let page = 1;
  let updated = 0;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const users = data?.users || [];
    if (users.length === 0) break;

    for (const u of users) {
      const meta = { ...(u.user_metadata || {}) };
      const patch = { ...meta, ...METADATA_EMPTY };
      if (JSON.stringify(patch) !== JSON.stringify(meta)) {
        updated += 1;
        if (!dryRun) {
          await admin.auth.admin.updateUserById(u.id, { user_metadata: patch });
        }
      }
    }

    if (users.length < 100) break;
    page += 1;
  }
  console.log(`  user_metadata activity keys reset for ${updated} users`);
  return updated;
}

async function ensureTestUser(admin, email, testRole) {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = (list?.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    const meta = { ...(existing.user_metadata || {}), robeo_test_role: testRole, ...METADATA_EMPTY };
    if (!dryRun) {
      await admin.auth.admin.updateUserById(existing.id, { user_metadata: meta });
    }
    return { id: existing.id, email, created: false };
  }

  if (dryRun) return { id: null, email, created: true };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { robeo_test_role: testRole, ...METADATA_EMPTY },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return { id: data.user.id, email, created: true };
}

async function verifyEmpty(admin, buyerId, sellerId) {
  const checks = [];

  checks.push({
    name: 'products (all rows)',
    count: (await countRows(admin, 'products')) ?? 0,
  });

  checks.push({
    name: 'catalog (active/null/sold products)',
    count:
      (await countRows(admin, 'products', (q) => q.or('status.eq.active,status.is.null,status.eq.sold'))) ?? 0,
  });

  for (const table of [
    'disputes',
    'offers',
    'messages',
    'transactions',
    'favorites',
    'reviews',
    'reports',
    'app_notifications',
    'follows',
    'price_watches',
    'product_price_snapshots',
    'wallet_transactions',
    'invoices',
    'transaction_line_items',
  ]) {
    checks.push({ name: table, count: (await countRows(admin, table)) ?? 0 });
  }

  for (const userId of [buyerId, sellerId].filter(Boolean)) {
    const label = userId === sellerId ? 'seller' : 'buyer';
    checks.push({
      name: `${label} profile listings`,
      count: (await countRows(admin, 'products', (q) => q.eq('user_id', userId))) ?? 0,
    });
    checks.push({
      name: `${label} sold listings`,
      count: (await countRows(admin, 'products', (q) => q.eq('user_id', userId).eq('status', 'sold'))) ?? 0,
    });
  }

  console.log('\n=== VERIFICATION ===');
  let failed = 0;
  for (const c of checks) {
    const ok = c.count === 0;
    console.log(`${ok ? 'OK' : 'FAIL'} ${c.name}: ${c.count}`);
    if (!ok) failed += 1;
  }

  return failed;
}

function printBrowserCleanupHint() {
  console.log('\n=== BROWSER LOCAL STORAGE (manual) ===');
  console.log('Upload draft / saved search cache csak a böngészőben van — töröld DevTools → Application → Local Storage:');
  for (const key of BROWSER_LOCAL_KEYS) {
    console.log(`  - ${key}`);
  }
  console.log('Vagy inkognitó ablak / hard refresh az új tesztkörnyezethez.');
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in repo root .env.local');
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(dryRun ? '=== DRY RUN — MARKETPLACE WIPE ===' : '=== FULL MARKETPLACE WIPE ===');
  console.log('Auth users + schema preserved. Seed does NOT run.\n');

  console.log('1) Purge marketplace activity tables (child → parent)');
  for (const config of TABLES_TO_PURGE) {
    await deleteAllRows(admin, config);
  }

  console.log('\n2) Hard-delete all products (listings + sold)');
  await hardDeleteAllProducts(admin);

  console.log('\n3) Reset wallet balances');
  await resetWallets(admin);

  console.log('\n4) Clear storage buckets');
  for (const bucket of STORAGE_BUCKETS) {
    await emptyStorageBucket(admin, bucket);
  }

  console.log('\n5) Reset user_metadata activity keys (all users)');
  await resetAllUserMetadata(admin);

  console.log('\n6) Preserve admin + ensure test accounts');
  if (!dryRun) {
    const { error: adminErr } = await admin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('email', ADMIN_EMAIL);
    if (adminErr) console.warn('  Admin role update:', adminErr.message);
    else console.log(`  Admin role OK: ${ADMIN_EMAIL}`);
  }

  const buyer = await ensureTestUser(admin, BUYER_EMAIL, 'buyer');
  const seller = await ensureTestUser(admin, SELLER_EMAIL, 'seller');
  console.log(`  Buyer: ${buyer.email} ${buyer.created ? '(created)' : '(exists)'}`);
  console.log(`  Seller: ${seller.email} ${seller.created ? '(created)' : '(exists)'}`);

  printBrowserCleanupHint();

  if (dryRun) {
    console.log('\nDry run complete — re-run without --dry-run to apply.');
    process.exit(0);
  }

  const failed = await verifyEmpty(admin, buyer.id, seller.id);
  console.log(
    failed === 0
      ? '\nPASS — marketplace is empty. Browse/profile should start clean.'
      : `\nFAIL — ${failed} check(s) not empty.`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
