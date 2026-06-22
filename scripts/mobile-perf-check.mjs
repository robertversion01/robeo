#!/usr/bin/env node
/**
 * Mobil teljesítmény checklist — forrás szintű regresszió.
 * Futtatás: npm run mobile:perf
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function has(path, needle) {
  return read(path).includes(needle);
}

const checks = [
  ['Vékony katalógus SELECT', has('src/hooks/useProducts.ts', 'CATALOG_PRODUCT_SELECT')],
  ['Mobil lap méret (24)', has('src/hooks/useProducts.ts', 'CATALOG_PAGE_SIZE_MOBILE = 24')],
  ['Mobil seller enrich idle', has('src/hooks/useProducts.ts', 'runWhenIdle(() => void enrichSeller()')],
  ['getImageConnectionProfile', has('src/lib/connectionProfile.ts', 'getImageConnectionProfile')],
  ['mobilePerf util', has('src/lib/mobilePerf.ts', 'runWhenIdle')],
  ['Grid overscan mobil', has('src/components/product/ProductGrid.tsx', 'VIRTUAL_OVERSCAN_MOBILE')],
  ['Viewport warmup lookahead', has('src/hooks/useFeedViewportWarmup.ts', 'lookaheadRows')],
  ['LQIP PresetImage', has('src/components/product/PresetImage.tsx', 'preset-image-shell')],
  ['SW render image cache', has('public/sw.js', '/storage/v1/render/image/')],
  ['Font display swap', has('src/app/layout.tsx', 'display: "swap"')],
  ['Deploy sync idle defer', has('src/app/layout.tsx', 'requestIdleCallback')],
  ['Filter counts mobil delay', has('src/hooks/useCatalogFilterCounts.ts', '900')],
  ['Mobil feed ranking skip', has('src/components/browse/CatalogBrowsePanel.tsx', '!isMobileViewport()')],
];

console.log('=== Mobil teljesítmény checklist ===\n');
let pass = 0;
for (const [name, ok] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (ok) pass += 1;
}
console.log(`\n  Eredmény: ${pass}/${checks.length}\n`);
process.exit(pass === checks.length ? 0 : 1);
