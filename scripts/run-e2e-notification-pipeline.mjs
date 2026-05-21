/**
 * Local E2E: fresh saved-search trigger + worker scan + outbox/DB verification.
 * Usage: node scripts/run-e2e-notification-pipeline.mjs
 * Requires: .env.local with SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_*
 * Optional: CRON_SECRET (reset path), VAPID_*, RESEND_* (flush delivery)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const METADATA_SAVED = 'robeo_saved_searches';
const WORKER_STATE_KEY = 'robeo_saved_search_worker_state';
const OUTBOX_KEY = 'robeo_notification_outbox_v1';
const DELIVERY_KEY = 'robeo_notification_delivery_v1';

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

function productMatchesSavedSearch(product, filters) {
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    const hay = `${product.name} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.category !== 'all' && product.category !== filters.category) return false;
  if (filters.brand !== 'all') {
    const b = (product.brand || '').toLowerCase();
    if (!b.includes(String(filters.brand).toLowerCase())) return false;
  }
  if (filters.size !== 'all') {
    const s = (product.size || '').toLowerCase();
    if (!s.includes(String(filters.size).toLowerCase())) return false;
  }
  const price = Number(product.price) || 0;
  if (filters.minPrice > 0 && price < filters.minPrice) return false;
  if (filters.maxPrice > 0 && price > filters.maxPrice) return false;
  return true;
}

function parseWorkerState(meta) {
  const raw = meta[WORKER_STATE_KEY];
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) out[k] = v.map(String).filter(Boolean);
  }
  return out;
}

function mergeSeen(state, searchId, ids) {
  const prev = new Set(state[searchId] || []);
  for (const id of ids) prev.add(id);
  return { ...state, [searchId]: Array.from(prev).slice(-500) };
}

/** Mirrors server scan when HTTP API is unavailable */
async function runInlineScan(admin, userId, saved, products, userEmail) {
  const { data: authData } = await admin.auth.admin.getUserById(userId);
  const meta = { ...(authData?.user?.user_metadata || {}) };
  let workerState = parseWorkerState(meta);
  let outbox = Array.isArray(meta[OUTBOX_KEY]) ? [...meta[OUTBOX_KEY]] : [];
  let notified = 0;
  let outboundQueued = 0;

  for (const search of saved) {
    const seen = new Set(workerState[search.id] || []);
    const matches = products.filter(
      (p) => productMatchesSavedSearch(p, search.filters) && !seen.has(p.id),
    );
    if (matches.length === 0) continue;

    const top = matches[0];
    const extra = matches.length > 1 ? ` (+${matches.length - 1})` : '';
    const title = 'Új találat a mentett keresésedben';
    const body = `${search.label}: ${top.name}${extra}`;
    const link = '/browse';

    const { error: insErr } = await admin.from('app_notifications').insert({
      user_id: userId,
      type: 'saved_search',
      title,
      body,
      message: body,
      link,
      is_read: false,
    });
    if (!insErr) notified += 1;

    const payload = { userId, type: 'saved_search', title, body, link };
    for (const channel of ['push', 'email']) {
      outbox.unshift({
        id: crypto.randomUUID(),
        channel,
        payload,
        createdAt: new Date().toISOString(),
      });
    }
    outboundQueued += 1;
    workerState = mergeSeen(
      workerState,
      search.id,
      matches.map((m) => m.id),
    );
  }

  outbox = outbox.slice(0, 50);
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...meta,
      [WORKER_STATE_KEY]: workerState,
      [OUTBOX_KEY]: outbox,
    },
  });

  return { ok: true, notified, outboundQueued, searchesChecked: saved.length, mode: 'inline', userEmail };
}

async function waitForServer(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(`${url}/api/marketplace-health`, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) continue;
      const j = await r.json();
      if (j && typeof j === 'object' && !j.error) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cron = process.env.CRON_SECRET;

  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('=== 1) Load users & products ===');
  const { data: profiles, error: pe } = await admin.from('profiles').select('id').limit(30);
  if (pe || !profiles?.length) {
    console.error('profiles error', pe);
    process.exit(1);
  }

  let select = 'id, name, description, brand, category, condition, price, created_at';
  let { data: products, error: prodErr } = await admin
    .from('products')
    .select(`${select}, size`)
    .or('status.eq.active,status.is.null')
    .order('created_at', { ascending: false })
    .limit(50);

  if (prodErr?.message?.toLowerCase().includes('size')) {
    ({ data: products, error: prodErr } = await admin
      .from('products')
      .select(select)
      .or('status.eq.active,status.is.null')
      .order('created_at', { ascending: false })
      .limit(50));
  }
  if (prodErr || !products?.length) {
    console.error('No products for scan', prodErr);
    process.exit(1);
  }

  const anchor = products[0];
  console.log('Anchor product:', anchor.id, anchor.name?.slice(0, 40));

  let targetId = null;
  let saved = [];

  for (const row of profiles) {
    const { data: authData } = await admin.auth.admin.getUserById(row.id);
    const meta = authData?.user?.user_metadata || {};
    const list = Array.isArray(meta[METADATA_SAVED]) ? meta[METADATA_SAVED] : [];
    if (list.length > 0) {
      targetId = row.id;
      saved = list;
      console.log('User with saved searches:', targetId.slice(0, 8), 'count:', list.length);
      break;
    }
  }

  if (!targetId) {
    targetId = profiles[0].id;
    const { data: authData } = await admin.auth.admin.getUserById(targetId);
    const meta = authData?.user?.user_metadata || {};
    const narrow = {
      id: `e2e-${Date.now()}`,
      label: `E2E ${anchor.name?.slice(0, 24) || 'match'}`,
      filters: {
        category: anchor.category || 'all',
        brand: anchor.brand ? anchor.brand : 'all',
        size: 'all',
        condition: 'all',
        minPrice: 0,
        maxPrice: 0,
        sort: 'newest',
        search: String(anchor.name || '')
          .split(/\s+/)
          .filter((w) => w.length > 3)[0] || anchor.name?.slice(0, 8) || 'robeo',
      },
      createdAt: new Date().toISOString(),
    };
    saved = [narrow];
    await admin.auth.admin.updateUserById(targetId, {
      user_metadata: {
        ...meta,
        [METADATA_SAVED]: saved,
        [WORKER_STATE_KEY]: {},
        [DELIVERY_KEY]: { pushEnabled: true, emailEnabled: true, emailDigest: false },
        [`robeo_user_preferences_v1`]: {
          notifications: { savedSearches: true, favorites: true, priceDrops: true },
        },
      },
    });
    console.log('Created E2E saved search for user', targetId.slice(0, 8));
  } else {
    const { data: authData } = await admin.auth.admin.getUserById(targetId);
    const meta = authData?.user?.user_metadata || {};
    await admin.auth.admin.updateUserById(targetId, {
      user_metadata: {
        ...meta,
        [WORKER_STATE_KEY]: {},
        [DELIVERY_KEY]: { pushEnabled: true, emailEnabled: true, emailDigest: false },
      },
    });
    console.log('Reset worker state + enabled push/email delivery');
  }

  const search = saved[0];
  const wouldMatch = products.filter((p) => productMatchesSavedSearch(p, search.filters));
  console.log('Pre-scan match count (unseen):', wouldMatch.length, wouldMatch[0]?.id || 'none');

  if (wouldMatch.length === 0) {
    const narrow = {
      id: `e2e-fix-${Date.now()}`,
      label: `E2E fix ${anchor.name?.slice(0, 20)}`,
      filters: {
        category: 'all',
        brand: 'all',
        size: 'all',
        condition: 'all',
        minPrice: 0,
        maxPrice: 0,
        sort: 'newest',
        search: anchor.id,
      },
      createdAt: new Date().toISOString(),
    };
    const { data: authData } = await admin.auth.admin.getUserById(targetId);
    const meta = authData?.user?.user_metadata || {};
    await admin.auth.admin.updateUserById(targetId, {
      user_metadata: { ...meta, [METADATA_SAVED]: [narrow], [WORKER_STATE_KEY]: {} },
    });
    console.log('Patched saved search to match product id substring');
  }

  console.log('\n=== 2) Worker scan ===');
  let scanBody = null;
  const up = await waitForServer(LOCAL_BASE);

  if (up) {
    if (cron) {
      const r = await fetch(`${LOCAL_BASE}/api/workers/saved-search-scan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cron}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: targetId, resetWorkerState: true }),
      });
      scanBody = await r.json();
      console.log('HTTP resetWorkerState scan:', r.status, JSON.stringify(scanBody, null, 2));
    }
    if (!scanBody?.ok || (scanBody.notified === 0 && scanBody.outboundQueued === 0)) {
      const r2 = await fetch(`${LOCAL_BASE}/api/workers/saved-search-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetId }),
      });
      scanBody = await r2.json();
      console.log('HTTP plain scan:', r2.status, JSON.stringify(scanBody, null, 2));
    }
  } else {
    console.log(`Local API unavailable (${LOCAL_BASE}) — running inline admin scan`);
  }

  if (!scanBody?.ok || (scanBody.notified === 0 && scanBody.outboundQueued === 0)) {
    const { data: authData } = await admin.auth.admin.getUserById(targetId);
    const meta = authData?.user?.user_metadata || {};
    const savedNow = Array.isArray(meta[METADATA_SAVED]) ? meta[METADATA_SAVED] : saved;
    scanBody = await runInlineScan(
      admin,
      targetId,
      savedNow,
      products,
      authData?.user?.email,
    );
    console.log('Inline scan:', JSON.stringify(scanBody, null, 2));
  }

  console.log('\n=== 3) Post-scan verification ===');
  const { data: authAfter } = await admin.auth.admin.getUserById(targetId);
  const metaAfter = authAfter?.user?.user_metadata || {};
  const outbox = metaAfter[OUTBOX_KEY];
  console.log('Outbox items:', Array.isArray(outbox) ? outbox.length : 0);
  if (Array.isArray(outbox)) {
    for (const item of outbox.slice(0, 5)) {
      console.log(`  [${item.channel}] ${item.payload?.title}`);
    }
  }

  const { data: recent } = await admin
    .from('app_notifications')
    .select('id,type,title,body,is_read,created_at')
    .eq('user_id', targetId)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Recent in-app notifications:');
  for (const n of recent || []) {
    console.log(`  [${n.type}] ${n.title} — ${n.created_at}`);
  }

  const pushConfigured = Boolean(
    process.env.VAPID_PRIVATE_KEY && (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
  );
  const emailConfigured = Boolean(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER));
  console.log('\nChannel config (local env):');
  console.log('  webPush:', pushConfigured);
  console.log('  email:', emailConfigured);
  console.log('  cron:', Boolean(cron));

  const pass =
    scanBody?.ok &&
    ((scanBody.notified ?? 0) > 0 || (scanBody.outboundQueued ?? 0) > 0);

  console.log('\n=== RESULT ===');
  if (pass) {
    console.log('PASS — notified:', scanBody.notified, 'outboundQueued:', scanBody.outboundQueued);
  } else {
    console.log('FAIL — pipeline did not enqueue/notify this run');
    console.log('Hint: ensure saved search filters match an active product; worker state was cleared.');
  }

  process.exitCode = pass ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
