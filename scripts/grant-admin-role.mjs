/**
 * Grant admin role to a profile by email.
 * Usage: node scripts/grant-admin-role.mjs hevesi.tr@gmail.com
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const email = process.argv[2] || 'hevesi.tr@gmail.com';

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await admin
  .from('profiles')
  .update({ role: 'admin' })
  .eq('email', email)
  .select('id, email, role');

if (error) {
  console.error('Update failed:', error.message);
  process.exit(1);
}

if (!data?.length) {
  console.error('No profile found for', email);
  process.exit(1);
}

console.log('OK — admin role granted:');
console.log(JSON.stringify(data[0], null, 2));
