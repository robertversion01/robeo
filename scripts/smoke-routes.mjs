#!/usr/bin/env node
/**
 * Gyors smoke teszt — fő route-ok + API elérhetőség.
 * Futtatás: node scripts/smoke-routes.mjs [baseUrl]
 */
const base = process.argv[2]?.replace(/\/$/, '') || 'http://localhost:3000';

const routes = [
  '/',
  '/browse',
  '/favorites',
  '/login',
  '/api/health/marketplace',
  '/api/app-version',
  '/api/search/visual',
];

async function check(path, method = 'GET') {
  const url = `${base}${path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: path.includes('/api/search/visual') ? 'POST' : method,
      headers: path.includes('/api/search/visual') ? { 'Content-Type': 'application/json' } : {},
      body: path.includes('/api/search/visual') ? JSON.stringify({}) : undefined,
      redirect: 'follow',
    });
    const ms = Date.now() - started;
    const ok =
      res.status < 500 ||
      (path.includes('/api/search/visual') && (res.status === 400 || res.status === 503));
    return { path, status: res.status, ms, ok };
  } catch (e) {
    return { path, status: 0, ms: Date.now() - started, ok: false, error: String(e) };
  }
}

const results = await Promise.all(routes.map((r) => check(r)));
let failed = 0;
for (const r of results) {
  const tag = r.ok ? 'OK' : 'FAIL';
  if (!r.ok) failed += 1;
  console.log(`${tag} ${r.status} ${r.ms}ms ${r.path}${r.error ? ` (${r.error})` : ''}`);
}
process.exit(failed > 0 ? 1 : 0);
