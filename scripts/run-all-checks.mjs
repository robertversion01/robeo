#!/usr/bin/env node
/**
 * Teljes helyi QA futtatás — build + parity + smoke + audit + env.
 * Futtatás: npm run test:all
 * Opcionális: SKIP_BUILD=1 npm run test:all
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';

function loadEnvFile(name) {
  const p = join(root, name);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
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

loadEnvFile('.env.local');

const results = [];

function run(name, cmd, args = [], opts = {}) {
  const started = Date.now();
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, ...opts.env },
    ...opts,
  });
  const ms = Date.now() - started;
  const ok = r.status === 0;
  results.push({ name, ok, ms, status: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' });
  return ok;
}

async function fetchOk(path, init = {}) {
  const started = Date.now();
  try {
    const res = await fetch(`${base}${path}`, init);
    const ms = Date.now() - started;
    return { ok: res.status < 500, status: res.status, ms };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - started, error: String(e) };
  }
}

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║              Robeo — teljes helyi QA futtatás                ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ── 0) Dev szerver ──
const ping = await fetchOk('/api/app-version');
results.push({
  name: 'Dev szerver elérhető',
  ok: ping.ok,
  ms: ping.ms,
  status: ping.ok ? 0 : 1,
  stdout: ping.ok ? `HTTP ${ping.status}` : ping.error || 'down',
  stderr: '',
});

if (!process.env.SKIP_BUILD) {
  run('Production build', 'npm', ['run', 'build']);
} else {
  results.push({ name: 'Production build (skip)', ok: true, ms: 0, status: 0, stdout: 'SKIP_BUILD=1', stderr: '' });
}

// ── Statikus / forrás ellenőrzések ──
const staticChecks = [
  ['Vinted parity', 'npm', ['run', 'parity:check']],
  ['Mobil perf', 'npm', ['run', 'mobile:perf']],
  ['Gesztus regresszió', 'npm', ['run', 'gesture:check']],
  ['Kép audit', 'npm', ['run', 'audit:images']],
  ['Route smoke', 'npm', ['run', 'smoke:routes', '--', base]],
  ['DB patch check', 'npm', ['run', 'db:check-patches']],
  ['Marketplace verify', 'node', ['scripts/verify-marketplace.mjs']],
];

const envGated = new Set(['DB patch check', 'Marketplace verify', 'E2E wallet release', 'E2E notification pipeline']);

for (const [name, cmd, args] of staticChecks) {
  if (envGated.has(name) && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    results.push({
      name: `${name} (skip — nincs SERVICE_ROLE)`,
      ok: true,
      ms: 0,
      status: 0,
      stdout: 'Állítsd be: SUPABASE_SERVICE_ROLE_KEY a .env.local-ban',
      stderr: '',
    });
    continue;
  }
  run(name, cmd, args);
}

// ── ESLint (csak error szám — warning nem blokkol) ──
const lint = spawnSync('npm', ['run', 'lint'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
});
const lintOut = `${lint.stdout || ''}\n${lint.stderr || ''}`;
const errMatch = lintOut.match(/(\d+)\s+errors?/);
const warnMatch = lintOut.match(/(\d+)\s+warnings?/);
const lintErrors = errMatch ? Number(errMatch[1]) : lint.status === 0 ? 0 : 1;
results.push({
  name: 'ESLint (0 error kötelező)',
  ok: lintErrors === 0,
  ms: 0,
  status: lint.status ?? 1,
  stdout: `errors=${lintErrors} warnings=${warnMatch?.[1] ?? '?'}`,
  stderr: lintErrors > 0 ? 'Futtasd: npm run lint' : '',
});

// ── Supabase katalógus audit (service role szükséges) ──
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  run('Katalógus audit', 'node', ['scripts/audit-catalog.mjs']);
} else {
  results.push({
    name: 'Katalógus audit (skip)',
    ok: true,
    ms: 0,
    status: 0,
    stdout: 'SUPABASE_SERVICE_ROLE_KEY hiányzik',
    stderr: '',
  });
}

// ── Extra HTTP route-ok ──
const extraRoutes = [
  ['/products/00000000-0000-0000-0000-000000000001', 'GET'],
  ['/api/health/marketplace', 'GET'],
  ['/api/marketplace-health', 'GET'],
  ['/sw.js', 'GET'],
];

for (const [path, method] of extraRoutes) {
  const r = await fetchOk(path, { method, redirect: 'follow' });
  const acceptable =
    path.startsWith('/products/') ? r.status === 200 || r.status === 404 : r.ok;
  results.push({
    name: `HTTP ${method} ${path}`,
    ok: acceptable,
    ms: r.ms,
    status: acceptable ? 0 : 1,
    stdout: `HTTP ${r.status}`,
    stderr: '',
  });
}

// ── E2E (csak ha SERVICE_ROLE + dev fut) ──
if (process.env.SUPABASE_SERVICE_ROLE_KEY && ping.ok) {
  run('E2E wallet release', 'npm', ['run', 'test:wallet-release']);
  run('E2E notification pipeline', 'npm', ['run', 'test:notifications']);
} else {
  results.push({
    name: 'E2E wallet + notifications (skip)',
    ok: true,
    ms: 0,
    status: 0,
    stdout: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'dev szerver nem fut'
      : 'SUPABASE_SERVICE_ROLE_KEY hiányzik',
    stderr: '',
  });
}

// ── Összesítés ──
console.log('\n=== Eredmények ===\n');
let pass = 0;
for (const r of results) {
  const mark = r.ok ? 'PASS' : 'FAIL';
  if (r.ok) pass += 1;
  console.log(`  [${mark}] ${r.name} (${r.ms}ms)`);
  if (!r.ok && r.stderr) {
    const tail = r.stderr.trim().split('\n').slice(-8).join('\n');
    if (tail) console.log(`         ${tail.replace(/\n/g, '\n         ')}`);
  }
  if (!r.ok && r.stdout && !r.stderr) {
    const tail = r.stdout.trim().split('\n').slice(-5).join('\n');
    if (tail) console.log(`         ${tail.replace(/\n/g, '\n         ')}`);
  }
}

console.log(`\nÖsszesen: ${pass}/${results.length} PASS\n`);
process.exit(pass === results.length ? 0 : 1);
