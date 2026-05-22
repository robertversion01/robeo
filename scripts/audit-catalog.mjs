/** Katalógus + activity audit — node scripts/audit-catalog.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function countTable(table) {
  try {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

const { data: products } = await admin
  .from('products')
  .select('id, name, status, user_id')
  .or('status.eq.active,status.is.null,status.eq.sold')
  .order('created_at', { ascending: false });

const { data: profiles } = await admin.from('profiles').select('id, email');
const byEmail = Object.fromEntries((profiles || []).map((p) => [p.id, p.email]));

console.log('=== CATALOG ===');
console.log('Visible products (active/null/sold):', products?.length ?? 0);
for (const p of products || []) {
  console.log(`  ${byEmail[p.user_id] || p.user_id?.slice(0, 8)} | ${p.status || 'null'} | ${p.name?.slice(0, 60)}`);
}

console.log('\n=== ACTIVITY COUNTS ===');
for (const table of [
  'offers',
  'messages',
  'transactions',
  'favorites',
  'reviews',
  'app_notifications',
  'reports',
  'invoices',
]) {
  const n = await countTable(table);
  console.log(`  ${table}: ${n === null ? '(n/a)' : n}`);
}

const buyerEmail = 'robeo.test.buyer@robeo.local';
const sellerEmail = 'robeo.test.seller@robeo.local';
const buyerId = profiles?.find((p) => p.email === buyerEmail)?.id;
const sellerId = profiles?.find((p) => p.email === sellerEmail)?.id;

if (buyerId || sellerId) {
  console.log('\n=== TEST ACCOUNTS ===');
  for (const [label, uid] of [
    ['buyer', buyerId],
    ['seller', sellerId],
  ]) {
    if (!uid) continue;
    const sent = await admin.from('offers').select('*', { count: 'exact', head: true }).eq('buyer_id', uid);
    const incoming = await admin.from('offers').select('*', { count: 'exact', head: true }).eq('seller_id', uid);
    const msgs = await admin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);
    const txs = await admin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`);
    console.log(`  ${label}: offers sent=${sent.count ?? 0} incoming=${incoming.count ?? 0} messages=${msgs.count ?? 0} transactions=${txs.count ?? 0}`);
  }
}
