/**
 * E2E trigger via cron resetWorkerState (no service role needed).
 * node scripts/trigger-saved-search-notification.mjs
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
loadEnv('.env.vercel.pull');

async function main() {
  const cron = process.env.CRON_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!cron) {
    console.error('Missing CRON_SECRET in .env.local');
    process.exit(1);
  }
  if (!url || !anon) {
    console.error('Missing Supabase URL/anon in .env.local');
    process.exit(1);
  }

  const profilesRes = await fetch(`${url}/rest/v1/profiles?select=id&limit=20`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  const profiles = await profilesRes.json();
  if (!profilesRes.ok || !Array.isArray(profiles)) {
    console.error('profiles fetch failed', profiles);
    process.exit(1);
  }

  let targetId = null;
  for (const row of profiles) {
    const id = row.id;
    const r = await fetch(`${BASE}/api/workers/saved-search-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    });
    const j = await r.json();
    if (j.searchesChecked > 0) {
      targetId = id;
      console.log('Found user with saved searches:', id, 'searchesChecked:', j.searchesChecked);
      break;
    }
  }

  if (!targetId) {
    console.error('No user with robeo_saved_searches metadata. Save a search in the UI first.');
    process.exit(1);
  }

  console.log('\nTriggering resetWorkerState + scan…');
  const trigger = await fetch(`${BASE}/api/workers/saved-search-scan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cron}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: targetId, resetWorkerState: true }),
  });
  const body = await trigger.json();
  console.log('Status:', trigger.status);
  console.log(JSON.stringify(body, null, 2));

  const ok =
    trigger.status === 200 &&
    body.ok &&
    (body.notified > 0 || body.outboundQueued > 0);

  if (ok) {
    console.log('\nPASS — E2E trigger fired (in-app and/or outbound queued)');
  } else if (trigger.status === 200 && body.ok && body.reset !== true && body.notified === 0) {
    console.log('\nWARN — resetWorkerState not deployed yet? Push aa06e0b+ and redeploy, then re-run.');
  } else {
    console.log('\nWARN — no notification this run');
  }
  process.exitCode = ok ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
