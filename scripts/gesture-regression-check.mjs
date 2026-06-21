#!/usr/bin/env node
/**
 * Sprint 3 — gesztus regresszió: egyetlen config forrás + telefon QA checklist.
 * Futtatás: npm run gesture:check
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const configSrc = read('src/lib/galleryGestureConfig.ts');
const snap = read('src/hooks/useSnapCarousel.ts');
const gestures = read('src/hooks/useImageGalleryGestures.ts');

function extractGestureValues(src) {
  const out = {};
  for (const m of src.matchAll(/(\w+):\s*([\d.]+)/g)) {
    out[m[1]] = Number(m[2]);
  }
  return out;
}

const values = extractGestureValues(configSrc);

const checks = [
  {
    name: 'galleryGestureConfig export',
    ok: configSrc.includes('export const GALLERY_GESTURE'),
  },
  {
    name: 'useSnapCarousel → galleryGestureConfig',
    ok: snap.includes("from '@/lib/galleryGestureConfig'") && snap.includes('GALLERY_GESTURE'),
  },
  {
    name: 'useImageGalleryGestures → galleryGestureConfig',
    ok: gestures.includes("from '@/lib/galleryGestureConfig'") && gestures.includes('GALLERY_GESTURE'),
  },
  {
    name: 'Nincs duplikált swipeCommitMinPx a hookokban',
    ok: !snap.match(/swipeCommitMinPx:\s*\d/) && !gestures.match(/longPressMs:\s*450(?!\s*[,}])/),
  },
  {
    name: 'Feed + PDP + viewer osztály konstansok',
    ok:
      configSrc.includes('GALLERY_SURFACE_CLASS') &&
      configSrc.includes('GALLERY_CAROUSEL_CLASS') &&
      configSrc.includes('GALLERY_VIEWER_CAROUSEL_CLASS'),
  },
  {
    name: 'Long-press 450ms',
    ok: values.longPressMs === 450,
  },
  {
    name: 'Swipe commit min 52px',
    ok: values.swipeCommitMinPx === 52,
  },
];

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║        Robeo — Gesture Regression Check (Sprint 3)          ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let pass = 0;
for (const c of checks) {
  const mark = c.ok ? '✓' : '✗';
  if (c.ok) pass += 1;
  console.log(`  ${mark} ${c.name}`);
}

console.log(`\n  Eredmény: ${pass}/${checks.length} automatikus check OK\n`);

console.log('── Közös gesztus értékek (galleryGestureConfig.ts) ──\n');
for (const [k, v] of Object.entries(values)) {
  console.log(`  ${k.padEnd(22)} ${v}`);
}

console.log(`
── Telefon QA checklist (Chrome → Device toolbar, touch) ──

  1. Feed kártya carousel
     - Gyors horizontál flick → pontosan ±1 kép (commit ≥ ${values.swipeCommitMinPx}px vagy ${Math.round(values.swipeCommitRatio * 100)}% szélesség)
     - Függőleges scroll → feed görget, carousel nem ragad

  2. Long-press (~${values.longPressMs}ms)
     - Fullscreen viewer nyílik, nincs natív „Kép mentése” menü
     - Enyhe vibráció (${values.longPressVibrateMs}ms) ha támogatott

  3. Viewer
     - Horizontál swipe = ±1 kép (ugyanaz a snap logika)
     - Pinch / double-tap zoom, bezárás után scroll visszaáll

  4. PDP galéria
     - Ugyanaz a gesztus-érzet mint feed kártyán
     - Tap → navigáció / viewer, scroll nem ütközik

  5. Regresszió
     - Kategória chip swipe nem aktiválódik galéria felett
     - View transition card→PDP működik tap után
`);

process.exit(pass === checks.length ? 0 : 1);
