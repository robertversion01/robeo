/**
 * Mely patch-ek futottak már? — node scripts/check-supabase-patches.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvLocal() {
  const p = path.join(root, '.env.local');
  if (!fs.existsSync(p)) return false;
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
    if (!process.env[k]) process.env[k] = v;
  }
  return true;
}

const CHECKS = [
  { patch: 'fix-everything-schema.sql', label: 'profiles', path: 'profiles?select=id&limit=1' },
  { patch: 'fix-everything-schema.sql', label: 'follows', path: 'follows?select=id&limit=1' },
  { patch: 'fix-everything-schema.sql', label: 'app_notifications', path: 'app_notifications?select=id&limit=1' },
  { patch: 'patch-wallet-schema.sql', label: 'wallets', path: 'wallets?select=user_id&limit=1' },
  {
    patch: 'patch-wallet-schema.sql',
    label: 'transactions (wallet oszlopok)',
    path: 'transactions?select=wallet_pending_credited_at,wallet_released_at&limit=1',
  },
  {
    patch: 'patch-vinted-advanced.sql',
    label: 'wallet_transactions',
    path: 'wallet_transactions?select=id&limit=1',
  },
  { patch: 'patch-vinted-advanced.sql', label: 'price_watches', path: 'price_watches?select=id&limit=1' },
  {
    patch: 'patch-vinted-advanced.sql',
    label: 'tracking_number',
    path: 'transactions?select=tracking_number&limit=1',
  },
  { patch: 'patch-vinted-legal.sql', label: 'invoices', path: 'invoices?select=id&limit=1' },
  {
    patch: 'patch-vinted-legal.sql',
    label: 'profiles (legal mezők)',
    path: 'profiles?select=legal_accepted_at,legal_version&limit=1',
  },
  {
    patch: 'patch-profiles-admin-role.sql',
    label: 'profiles.role',
    path: 'profiles?select=role&limit=1',
  },
  {
    patch: 'patch-marketplace-round2.sql',
    label: 'product_price_snapshots',
    path: 'product_price_snapshots?select=id&limit=1',
  },
  {
    patch: 'patch-bundle-v2-promote.sql',
    label: 'transaction_line_items',
    path: 'transaction_line_items?select=id&limit=1',
  },
  {
    patch: 'patch-bundle-v2-promote.sql',
    label: 'products (promote analytics)',
    path: 'products?select=promote_demo_views,promote_last_boosted_at&limit=1',
  },
];

async function probe(baseUrl, key, { patch, label, path: restPath }) {
  const res = await fetch(`${baseUrl}/rest/v1/${restPath}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const text = await res.text();
  const ok = res.ok;
  return { patch, label, ok, detail: ok ? 'OK' : `HTTP ${res.status} — ${text.slice(0, 100)}` };
}

async function main() {
  if (!loadEnvLocal()) {
    console.log('Nincs .env.local — nem tudok automatikusan ellenőrizni.');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.log('Hiányzik: NEXT_PUBLIC_SUPABASE_URL és/vagy SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const project = url.match(/https:\/\/([^.]+)/)?.[1] || 'supabase';
  console.log(`\nROBEO patch állapot — projekt: ${project}\n`);

  const results = [];
  for (const c of CHECKS) {
    results.push(await probe(url, key, c));
  }

  const byPatch = new Map();
  for (const r of results) {
    if (!byPatch.has(r.patch)) byPatch.set(r.patch, []);
    byPatch.get(r.patch).push(r);
  }

  for (const [patch, items] of byPatch) {
    const allOk = items.every((i) => i.ok);
    const icon = allOk ? '✓' : items.some((i) => i.ok) ? '~' : '✗';
    console.log(`${icon} ${patch}`);
    for (const i of items) {
      console.log(`    ${i.ok ? '  OK' : ' FAIL'}  ${i.label}${i.ok ? '' : ' — ' + i.detail}`);
    }
    console.log('');
  }

  const missing = [...byPatch.entries()].filter(([, items]) => !items.every((i) => i.ok));
  if (missing.length === 0) {
    console.log('Minden ellenőrzött patch elem megvan.\n');
  } else {
    console.log('Futtasd a ✗ vagy ~ jelű patch fájl(oka)t a Supabase SQL Editorban.\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
