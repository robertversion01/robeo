/**
 * Marketplace környezet ellenőrzés — futtatás: node scripts/verify-marketplace.mjs
 * Opcionális: BASE_URL=http://localhost:3000 CRON_SECRET=... node scripts/verify-marketplace.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvLocal() {
  const p = path.join(root, '.env.local');
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, 'utf8');
  for (const line of raw.split('\n')) {
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

const checks = [];

function ok(name, pass, detail = '') {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'OK' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://127.0.0.1:11434';

  ok('CRON_SECRET', Boolean(cronSecret), cronSecret ? 'configured' : 'missing in .env.local');
  ok('SUPABASE_SERVICE_ROLE_KEY', Boolean(serviceKey), serviceKey ? 'configured' : 'missing in .env.local');
  ok('NEXT_PUBLIC_SUPABASE_URL', Boolean(supabaseUrl));

  if (serviceKey && supabaseUrl) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/products?select=id&limit=1`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      ok('Supabase admin REST', res.ok, `HTTP ${res.status}`);
    } catch (e) {
      ok('Supabase admin REST', false, e.message);
    }

    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/product_price_snapshots?select=id&limit=1`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        },
      );
      if (res.status === 404 || res.status === 400) {
        ok('product_price_snapshots table', false, 'patch-marketplace-round2.sql not applied?');
      } else {
        ok('product_price_snapshots table', res.ok || res.status === 200, `HTTP ${res.status}`);
      }
    } catch (e) {
      ok('product_price_snapshots table', false, e.message);
    }
  }

  try {
    const res = await fetch(`${ollamaUrl}/api/tags`);
    const data = res.ok ? await res.json() : null;
    const models = (data?.models || []).map((m) => m.name);
    const hasLlama = models.some((n) => n.startsWith('llama3'));
    ok('Ollama reachable', res.ok, models.length ? `models: ${models.slice(0, 3).join(', ')}` : '');
    ok('Ollama llama3 model', hasLlama, hasLlama ? 'ok' : 'run: ollama pull llama3');
  } catch (e) {
    ok('Ollama reachable', false, e.message);
  }

  const base = process.env.BASE_URL || 'http://localhost:3000';
  if (cronSecret) {
    try {
      const res = await fetch(`${base}/api/workers/saved-search-scan`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const text = await res.text();
      ok('Cron route GET', res.ok, `HTTP ${res.status} ${text.slice(0, 80)}`);
    } catch (e) {
      ok('Cron route GET', false, `${base} not running? ${e.message}`);
    }
  }

  const prod = process.env.PROD_URL || 'https://robeo.vercel.app';
  for (const path of ['/api/marketplace-health', '/api/health/marketplace']) {
    try {
      const res = await fetch(`${prod}${path}`);
      const text = await res.text();
      ok(`Production health ${path}`, res.ok, `HTTP ${res.status} ${text.slice(0, 120)}`);
      if (res.ok) break;
    } catch (e) {
      ok(`Production health ${path}`, false, e.message);
    }
  }

  const failed = checks.filter((c) => !c.pass).length;
  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
