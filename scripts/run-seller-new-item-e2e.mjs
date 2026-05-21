/**
 * seller_new_item trigger teszt — követő kap-e app_notifications rekordot új terméknél.
 * Futtatás: node scripts/run-seller-new-item-e2e.mjs <sellerUserId>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  const p = path.join(root, '.env.local');
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
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sellerId = process.argv[2];

async function rest(path, opts = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  return { res, json: text ? JSON.parse(text) : null };
}

async function main() {
  if (!url || !key) {
    console.error('Kell SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }
  if (!sellerId) {
    console.log('Használat: node scripts/run-seller-new-item-e2e.mjs <seller-uuid>');
    process.exit(1);
  }

  const { json: followers } = await rest(
    `follows?following_id=eq.${sellerId}&select=follower_id&limit=5`,
  );
  const follower = Array.isArray(followers) ? followers[0] : null;
  if (!follower) {
    console.log('Nincs követő ehhez az eladóhoz — előbb kövess egy teszt fiókkal.');
    process.exit(0);
  }

  const followerId = follower.follower_id;
  console.log('Követő:', followerId);

  const before = Date.now();
  const { res: insRes, json: product } = await rest('products', {
    method: 'POST',
    body: JSON.stringify({
      user_id: sellerId,
      name: `E2E teszt termék ${before}`,
      description: 'seller_new_item trigger teszt',
      price: 1000,
      category: 'other',
      status: 'active',
    }),
  });

  if (!insRes.ok) {
    console.error('Termék insert sikertelen', product);
    process.exit(1);
  }

  const productId = product?.[0]?.id || product?.id;
  console.log('Új termék:', productId);

  await new Promise((r) => setTimeout(r, 1500));

  const { json: notifs } = await rest(
    `app_notifications?user_id=eq.${followerId}&type=eq.seller_new_item&order=created_at.desc&limit=3&select=id,title,body,created_at`,
  );

  const hit = Array.isArray(notifs) && notifs.some((n) => (n.body || '').includes('E2E teszt') || (n.title || '').length > 0);

  if (hit) {
    console.log('OK — seller_new_item értesítés megjelent:', notifs[0]);
    process.exit(0);
  }

  console.log('FAIL — nincs seller_new_item notification. Futtasd: patch-marketplace-round2.sql trigger');
  console.log('Utolsó notifikációk:', notifs);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
