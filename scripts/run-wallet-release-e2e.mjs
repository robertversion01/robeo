/**
 * Wallet release E2E — pending → available „Minden rendben” után.
 * Futtatás: node scripts/run-wallet-release-e2e.mjs [transactionId]
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
const base = process.env.BASE_URL || 'http://localhost:3000';

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
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { res, json };
}

async function main() {
  if (!url || !key) {
    console.error('Kell: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)');
    process.exit(1);
  }

  const txIdArg = process.argv[2];

  let tx;
  if (txIdArg) {
    const { res, json } = await rest(
      `transactions?id=eq.${txIdArg}&select=id,buyer_id,seller_id,status,amount,fee,shipping_cost,wallet_pending_credited_at,wallet_released_at`,
    );
    tx = Array.isArray(json) ? json[0] : null;
    if (!res.ok || !tx) {
      console.error('Tranzakció nem található:', txIdArg);
      process.exit(1);
    }
  } else {
    const { json } = await rest(
      'transactions?status=eq.atvetelre_var&wallet_pending_credited_at=not.is.null&wallet_released_at=is.null&select=id,buyer_id,seller_id,status,amount,fee,shipping_cost,wallet_pending_credited_at,wallet_released_at&limit=1',
    );
    tx = Array.isArray(json) ? json[0] : null;
    if (!tx) {
      console.log('Nincs tesztelhető tranzakció (atvetelre_var + pending credited, nincs release).');
      console.log('Hozz létre egy vásárlást, vagy add meg: node scripts/run-wallet-release-e2e.mjs <uuid>');
      process.exit(0);
    }
  }

  console.log('Tranzakció:', tx.id, 'státusz:', tx.status, 'eladó:', tx.seller_id);

  const { json: walletBefore } = await rest(
    `wallets?user_id=eq.${tx.seller_id}&select=pending_balance,available_balance`,
  );
  const w0 = Array.isArray(walletBefore) ? walletBefore[0] : null;
  console.log('Eladó egyenleg ELŐTTE:', w0);

  const confirmRes = await fetch(`${base}/api/transactions/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactionId: tx.id,
      buyerId: tx.buyer_id,
    }),
  });
  const confirmBody = await confirmRes.json();
  console.log('Confirm API:', confirmRes.status, confirmBody);

  if (!confirmRes.ok) {
    process.exit(1);
  }

  const { json: walletAfter } = await rest(
    `wallets?user_id=eq.${tx.seller_id}&select=pending_balance,available_balance`,
  );
  const w1 = Array.isArray(walletAfter) ? walletAfter[0] : null;
  console.log('Eladó egyenleg UTÁNA:', w1);

  const { json: txAfter } = await rest(
    `transactions?id=eq.${tx.id}&select=status,wallet_released_at`,
  );
  const t1 = Array.isArray(txAfter) ? txAfter[0] : null;
  console.log('Tranzakció UTÁNA:', t1);

  const released = t1?.status === 'sikeresen_atveve' && t1?.wallet_released_at;
  const pendingDown =
    w0 && w1 && Number(w1.pending_balance) < Number(w0.pending_balance);
  const availUp =
    w0 && w1 && Number(w1.available_balance) > Number(w0.available_balance);

  if (released && (pendingDown || availUp)) {
    console.log('\nOK — Wallet release E2E sikeres.');
    process.exit(0);
  }

  console.log('\nFIGYELEM — ellenőrizd manuálisan (RPC / már release-elt lehet).');
  process.exit(released ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
