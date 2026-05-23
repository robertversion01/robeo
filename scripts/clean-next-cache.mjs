#!/usr/bin/env node
/** Törli a .next cache-t — Turbopack/webpack lock vagy Windows jogosultsági hiba után. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = ['.next', path.join('node_modules', '.cache')];

for (const rel of targets) {
  const dir = path.join(root, rel);
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`[clean-next-cache] removed ${rel}`);
    }
  } catch (err) {
    console.warn(`[clean-next-cache] could not remove ${rel}:`, err?.message || err);
  }
}

console.log('[clean-next-cache] done');
