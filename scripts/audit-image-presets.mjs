#!/usr/bin/env node
/**
 * Kiírja a képpreset budgeteket és példa URL-eket — mobil QA / CI review.
 * Futtatás: node scripts/audit-image-presets.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const presetsSrc = readFileSync(join(root, 'src/lib/imagePresets.ts'), 'utf8');

const presetBlocks = [...presetsSrc.matchAll(/(\w+):\s*\{[^}]+width:\s*(\d+)[^}]+quality:\s*(\d+)/gs)];

console.log('=== Robeo image preset audit ===\n');
console.log('| Preset | Width | Quality |');
console.log('|--------|-------|---------|');
for (const [, name, width, quality] of presetBlocks) {
  if (name === 'IMAGE_QUALITY' || name === 'profileListing') continue;
  console.log(`| ${name} | ${width}px | q${quality} |`);
}

const budgets = [...presetsSrc.matchAll(/(\w+):\s*\{\s*maxKb:\s*(\d+)/g)];
console.log('\n=== Byte budgets (target max / image, WebP mobile) ===\n');
for (const [, name, kb] of budgets) {
  console.log(`  ${name}: ≤ ${kb} KB`);
}

console.log(`
=== Mobil QA checklist (Chrome DevTools → Network → Img) ===
  1. Feed első 3 kártya: eager, ~5–12 KB WebP, 140w variant
  2. Feed 4+ kártya: lazy, fetchpriority low
  3. Hero első tile: eager high, ~6–10 KB
  4. PDP aktív slide: preload + ~30–45 KB @ 560w
  5. PDP inaktív slide: lazy, ~6–10 KB @ 180w
  6. Viewer megnyitás: csak aktív ±1 slide tölt nagy presetet
  7. Rail / hasonló: ~8–10 KB @ 96w
`);
