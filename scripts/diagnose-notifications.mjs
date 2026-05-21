/**
 * Notification pipeline diagnostic (read-only, production-safe).
 * node scripts/diagnose-notifications.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.TEST_BASE_URL || 'https://robeo.vercel.app';

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

async function main() {
  console.log('=== Endpoints ===');
  for (const u of ['/api/push/vapid-public-key', '/api/marketplace-health']) {
    const r = await fetch(BASE + u);
    console.log(u, r.status, (await r.text()).slice(0, 180));
  }

  const cron = process.env.CRON_SECRET;
  if (!cron) {
    console.log('\nNo CRON_SECRET — skip workers');
    return;
  }

  console.log('\n=== Workers ===');
  for (const u of ['/api/workers/saved-search-scan', '/api/workers/notification-digest']) {
    const r = await fetch(BASE + u, {
      headers: { Authorization: `Bearer ${cron}` },
    });
    console.log(u, r.status, await r.text());
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log('\nNo SUPABASE_SERVICE_ROLE_KEY — skip DB (add to .env.local from Vercel for deep check)');
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('\n=== Users with saved searches ===');
  const { data: profiles } = await admin.from('profiles').select('id').limit(20);
  for (const row of profiles || []) {
    const uid = row.id;
    const { data: authData } = await admin.auth.admin.getUserById(uid);
    const u = authData?.user;
    if (!u) continue;
    const meta = u.user_metadata || {};
    const saved = meta.robeo_saved_searches;
    if (!Array.isArray(saved) || saved.length === 0) continue;

    const delivery = meta.robeo_notification_delivery_v1;
    const outbox = meta.robeo_notification_outbox_v1;
    const subs = meta.robeo_web_push_subscriptions_v1;
    const workerState = meta.robeo_saved_search_worker_state;
    const prefs = meta.robeo_user_preferences_v1;

    console.log(`\nUser ${uid.slice(0, 8)}… email=${u.email || 'n/a'}`);
    console.log('  savedSearches:', saved.length, saved.map((s) => s.label || s.id).join(', '));
    console.log('  delivery:', JSON.stringify(delivery || { pushEnabled: false, emailEnabled: false }));
    console.log('  notif prefs savedSearches:', prefs?.notifications?.savedSearches ?? '(default true)');
    console.log('  push subs:', Array.isArray(subs) ? subs.length : 0);
    console.log('  outbox items:', Array.isArray(outbox) ? outbox.length : 0);
    if (Array.isArray(outbox) && outbox.length) {
      for (const item of outbox.slice(0, 3)) {
        console.log(`    - [${item.channel}] ${item.payload?.title}`);
      }
    }
    const seenCount = workerState && typeof workerState === 'object'
      ? Object.values(workerState).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0)
      : 0;
    console.log('  worker seen product ids (total):', seenCount);

    const { data: recent } = await admin
      .from('app_notifications')
      .select('type,title,created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(3);
    console.log('  recent in-app:', recent?.length ? recent.map((n) => `[${n.type}] ${n.title}`).join(' | ') : 'none');
  }
}

main().catch(console.error);
