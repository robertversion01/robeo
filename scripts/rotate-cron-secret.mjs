#!/usr/bin/env node
/**
 * CRON_SECRET rotáció — Vercel Production + GitHub Actions + .env.local
 * Futtatás: npm run rotate:cron-secret
 * (vercel login + git push hitelesítés szükséges)
 */
import { spawnSync, execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const SECRET_NAME = 'CRON_SECRET';
const REPO = 'robertversion01/robeo';
const PROD_URL = process.env.PRODUCTION_URL || 'https://robeo.vercel.app';

function gitHubToken() {
  const cred = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
  });
  const match = cred.stdout.match(/password=(.+)/);
  if (!match) throw new Error('GitHub token nem elérhető (git credential)');
  return match[1].trim();
}

function setVercelEnv(value) {
  for (const env of ['production']) {
    spawnSync('vercel', ['env', 'rm', SECRET_NAME, env, '--yes'], { cwd: root, shell: true });
    const r = spawnSync('vercel', ['env', 'add', SECRET_NAME, env], {
      cwd: root,
      input: value + '\n',
      encoding: 'utf8',
      shell: true,
    });
    if (r.status !== 0) throw new Error(`vercel env add ${env} failed`);
    console.log(`OK Vercel ${env} ${SECRET_NAME}`);
  }
}

function upsertEnvLocal(value) {
  const p = path.join(root, '.env.local');
  let lines = fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n') : [];
  let found = false;
  lines = lines.map((line) => {
    if (line.startsWith(`${SECRET_NAME}=`)) {
      found = true;
      return `${SECRET_NAME}=${value}`;
    }
    return line;
  });
  if (!found) lines.push(`${SECRET_NAME}=${value}`);
  fs.writeFileSync(p, lines.join('\n').replace(/\n*$/, '\n'));
  console.log('OK .env.local');
}

async function setGitHubSecret(value, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const keyRes = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/public-key`, {
    headers,
  });
  if (!keyRes.ok) throw new Error(`GitHub public-key HTTP ${keyRes.status}`);
  const { key, key_id } = await keyRes.json();
  const sodium = await import('libsodium-wrappers');
  await sodium.default.ready;
  const binkey = sodium.default.from_base64(key, sodium.default.base64_variants.ORIGINAL);
  const enc = sodium.default.crypto_box_seal(value, binkey);
  const encrypted_value = sodium.default.to_base64(enc, sodium.default.base64_variants.ORIGINAL);
  const put = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/${SECRET_NAME}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ encrypted_value, key_id }),
  });
  if (!put.ok) throw new Error(`GitHub secret PUT HTTP ${put.status}`);
  console.log('OK GitHub Actions secret');
}

async function verify(value) {
  const res = await fetch(`${PROD_URL}/api/workers/saved-search-scan`, {
    headers: { Authorization: `Bearer ${value}` },
  });
  const text = await res.text();
  console.log(`Verify worker → HTTP ${res.status}`);
  if (res.status === 401) {
    console.warn('401: redeploy kell — vercel deploy --prod');
    return false;
  }
  if (res.status >= 500) {
    console.log('Auth OK (nem 401); worker válasz:', text.slice(0, 120));
    return true;
  }
  console.log(text.slice(0, 120));
  return res.ok;
}

async function main() {
  execSync('vercel whoami', { cwd: root, stdio: 'inherit' });
  const value = crypto.randomBytes(32).toString('base64url');
  console.log(`Új ${SECRET_NAME} generálva (${value.length} karakter)`);

  setVercelEnv(value);
  upsertEnvLocal(value);
  await setGitHubSecret(value, gitHubToken());

  console.log('Production redeploy...');
  execSync('vercel deploy --prod --yes', { cwd: root, stdio: 'inherit' });

  await verify(value);
  console.log('Rotáció kész. A régi secret érvénytelen.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
