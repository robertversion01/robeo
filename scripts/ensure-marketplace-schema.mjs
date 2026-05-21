/**
 * Ellenőrzi a séma állapotot és megpróbálja futtatni a patch-et (SUPABASE_DB_URL).
 * Futtatás: node scripts/ensure-marketplace-schema.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

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
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv('.env.local');
loadEnv('.env.vercel.production');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function probeSizeColumn() {
  if (!url || !key) {
    console.log('SKIP probe — missing SUPABASE URL or SERVICE_ROLE');
    return null;
  }
  const res = await fetch(`${url}/rest/v1/products?select=size&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (res.ok) return true;
  const text = await res.text();
  if (text.includes('size') && text.includes('does not exist')) return false;
  console.log('probe unexpected', res.status, text.slice(0, 120));
  return null;
}

async function main() {
  const hasSize = await probeSizeColumn();
  if (hasSize === true) {
    console.log('OK products.size column exists');
    process.exit(0);
  }

  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (dbUrl) {
    console.log('Applying patch via postgres...');
    const { spawnSync } = await import('child_process');
    const r = spawnSync('node', ['scripts/apply-supabase-patch.mjs'], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    if (r.status === 0) {
      const after = await probeSizeColumn();
      console.log(after ? 'OK patch applied' : 'WARN patch ran but size still missing');
      process.exit(after ? 0 : 1);
    }
  }

  console.log('\nACTION REQUIRED: Supabase SQL Editor → futtasd:');
  console.log('  supabase/patch-products-marketplace-columns.sql');
  console.log('\nVagy állítsd be SUPABASE_DB_URL a .env.local-ban és futtasd újra.');
  process.exit(hasSize === false ? 1 : 0);
}

main();
