/**
 * Manuális Vercel Deploy Hook trigger (fallback, ha a Git push nem indít buildet).
 *
 * 1. Vercel → Project → Settings → Git → Deploy Hooks → Create (branch: main)
 * 2. Másold az URL-t: .env.local → VERCEL_DEPLOY_HOOK_URL=...
 * 3. node scripts/trigger-vercel-deploy.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvLocal() {
  const p = path.join(root, '.env.local');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const hook = process.env.VERCEL_DEPLOY_HOOK_URL?.trim();
if (!hook) {
  console.error('Hiányzik VERCEL_DEPLOY_HOOK_URL (.env.local vagy környezeti változó).');
  console.error('Lásd: docs/VERCEL_DEPLOY.md');
  process.exit(1);
}

if (!hook.startsWith('https://api.vercel.com/')) {
  console.warn('Figyelem: a hook URL általában https://api.vercel.com/v1/integrations/deploy/... formátumú.');
}

const res = await fetch(hook, { method: 'POST' });
const body = await res.text();
console.log(`HTTP ${res.status}`);
if (body) console.log(body);
process.exit(res.ok ? 0 : 1);
