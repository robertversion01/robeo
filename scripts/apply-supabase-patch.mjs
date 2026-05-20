/**
 * Supabase SQL patch futtatás (DDL) — postgres kapcsolat szükséges.
 * Env: SUPABASE_DB_URL vagy DATABASE_URL (Supabase → Settings → Database → URI)
 * Futtatás: node scripts/apply-supabase-patch.mjs supabase/patch-products-marketplace-columns.sql
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvFile(name) {
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

loadEnvFile('.env.local');
loadEnvFile('.env.vercel.production');

const sqlFile = process.argv[2] || 'supabase/patch-products-marketplace-columns.sql';
const sqlPath = path.join(root, sqlFile);
if (!fs.existsSync(sqlPath)) {
  console.error('Missing SQL file:', sqlPath);
  process.exit(1);
}

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('SUPABASE_DB_URL or DATABASE_URL required for DDL apply.');
  console.error('Add Supabase Database URI to .env.local, then re-run.');
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
const { default: pg } = await import('pg');

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log('OK applied', sqlFile);
} finally {
  await client.end();
}
