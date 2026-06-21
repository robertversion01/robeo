#!/usr/bin/env node
/**
 * Teljes képarchitektúra audit — Vinted-szerű viselkedés ellenőrzéshez.
 * Futtatás: npm run audit:images
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const presetsSrc = readFileSync(join(root, 'src/lib/imagePresets.ts'), 'utf8');

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function grepCount(src, pattern) {
  const m = src.match(pattern);
  return m ? m.length : 0;
}

const presetBlocks = [
  ...presetsSrc.matchAll(/(\w+):\s*\{[^}]+width:\s*(\d+)[^}]+quality:\s*(\d+)/gs),
];

const budgets = [...presetsSrc.matchAll(/(\w+):\s*\{\s*maxKb:\s*(\d+)/g)];

const priorityCount = presetsSrc.match(/FEED_VIEWPORT_PRIORITY_COUNT\s*=\s*(\d+)/)?.[1] ?? '?';
const initialRender = presetsSrc.match(/FEED_INITIAL_RENDER_COUNT\s*=\s*(\d+)/)?.[1] ?? '?';
const preloadRadius = presetsSrc.match(/IMAGE_VIEWPORT_PRELOAD_RADIUS\s*=\s*(\d+)/)?.[1] ?? '?';

const productCard = read('src/components/product/ProductCard.tsx');
const productGrid = read('src/components/product/ProductGrid.tsx');
const snapCarousel = read('src/hooks/useSnapCarousel.ts');
const gestures = read('src/hooks/useImageGalleryGestures.ts');
const gestureConfig = read('src/lib/galleryGestureConfig.ts');
const viewer = read('src/components/product/ProductImageViewer.tsx');
const viewerCtx = read('src/context/FeedImageViewerContext.tsx');
const pdp = read('src/app/products/[id]/page.tsx');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           Robeo — Image Architecture Audit (Vinted)         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('── Preset méretek és minőség ──\n');
console.log('| Preset | Width | Quality |');
console.log('|--------|-------|---------|');
for (const [, name, width, quality] of presetBlocks) {
  if (name === 'IMAGE_QUALITY' || name === 'profileListing') continue;
  console.log(`| ${name} | ${width}px | q${quality} |`);
}

console.log('\n── Byte budget célok (WebP, mobil) ──\n');
for (const [, name, kb] of budgets) {
  console.log(`  ${name.padEnd(18)} ≤ ${kb} KB`);
}

console.log('\n── Architektúra konstansok ──\n');
console.log(`  FEED_VIEWPORT_PRIORITY_COUNT  = ${priorityCount}  (eager/high első kártyák)`);
console.log(`  FEED_INITIAL_RENDER_COUNT     = ${initialRender}  (kezdeti DOM mount)`);
console.log(`  IMAGE_VIEWPORT_PRELOAD_RADIUS = ${preloadRadius}  (carousel/viewer ±slide)`);

console.log('\n── Kódbázis ellenőrzések ──\n');

const checks = [
  {
    name: 'Globális feed viewer (React bubbling fix)',
    ok: viewerCtx.includes('FeedImageViewerProvider') && productCard.includes('useFeedImageViewer'),
  },
  {
    name: 'Long-press → viewer (nem böngésző menü)',
    ok: gestures.includes('onContextMenu') && gestures.includes('preventDefault') && gestures.includes('onOpenViewer'),
  },
  {
    name: 'Carousel 1 gesztus = max ±1 slide',
    ok: snapCarousel.includes('anchorIndex + 1') && snapCarousel.includes('onTouchEnd'),
  },
  {
    name: 'Közös galleryGestureConfig (feed + PDP + viewer)',
    ok:
      snapCarousel.includes('galleryGestureConfig') &&
      gestures.includes('galleryGestureConfig') &&
      productCard.includes('galleryGestureConfig') &&
      pdp.includes('galleryGestureConfig') &&
      viewer.includes('galleryGestureConfig'),
  },
  {
    name: 'Feed kártya viewport preload band',
    ok: productCard.includes('IMAGE_VIEWPORT_PRELOAD_RADIUS'),
  },
  {
    name: 'Viewer csak ±1 slide nagy preset',
    ok: viewer.includes('IMAGE_VIEWPORT_PRELOAD_RADIUS') && viewer.includes('inBand'),
  },
  {
    name: 'PDP aktív vs idle preset',
    ok: pdp.includes("isActive ? 'pdpMain' : 'pdpCarouselIdle'"),
  },
  {
    name: 'PDP LCP preload link',
    ok: pdp.includes("link.rel = 'preload'") && pdp.includes('fetchpriority'),
  },
  {
    name: 'Feed priorityCount prop',
    ok: productGrid.includes('priorityCount') && productGrid.includes('priority={index < priorityCount}'),
  },
  {
    name: 'Homepage feed preset (homepageFeed)',
    ok: productGrid.includes('cardImagePreset') && read('src/components/browse/CatalogBrowsePanel.tsx').includes('homepageFeed'),
  },
  {
    name: 'PresetImage srcset + picture',
    ok: read('src/components/product/PresetImage.tsx').includes('<picture') && read('src/components/product/PresetImage.tsx').includes('srcSet'),
  },
  {
    name: 'Kategória-swipe kizárás galériánál',
    ok: read('src/hooks/useFeedCategorySwipe.ts').includes('data-product-card-gallery'),
  },
  {
    name: 'Natív image menü tiltás (contextmenu/selectstart)',
    ok: read('src/hooks/useSuppressNativeImageMenu.ts').includes('contextmenu') &&
      read('src/context/FeedImageViewerContext.tsx').includes('useSuppressNativeImageMenu'),
  },
  {
    name: 'Feed CDN contain 4:5 + feedPresetImageClass',
    ok: presetsSrc.includes("resize: 'contain'") && presetsSrc.includes('feedPresetImageClass'),
  },
  {
    name: 'Viewer pinch / double-tap zoom',
    ok: viewer.includes('usePinchZoom'),
  },
  {
    name: 'Connection-aware feed presets',
    ok: read('src/lib/connectionProfile.ts').includes('getConnectionProfile'),
  },
  {
    name: 'LCP preload for first feed cards',
    ok: read('src/components/product/FeedLcpPreloader.tsx').includes('preloadImageUrls'),
  },
  {
    name: 'Long-press speculative viewer preload',
    ok: read('src/hooks/useImageGalleryGestures.ts').includes('onPreloadViewer'),
  },
  {
    name: 'ProductCard React.memo',
    ok: read('src/components/product/ProductCard.tsx').includes('memo(function ProductCard'),
  },
];

let pass = 0;
for (const c of checks) {
  const mark = c.ok ? '✓' : '✗';
  if (c.ok) pass += 1;
  console.log(`  ${mark} ${c.name}`);
}
console.log(`\n  Eredmény: ${pass}/${checks.length} automatikus check OK`);

console.log(`
── Mobil Network QA (Chrome DevTools → Network → Img) ──

  1. Főoldal első ${priorityCount} kártya:
     - loading=eager, fetchpriority=high
     - homepageFeed ~360–480w contain 4:5, ≤32 KB WebP
     - csak az első slide képe (carousel idx 0)

  2. Főoldal 7+ kártya:
     - loading=lazy, fetchpriority=low/auto
     - nem indul el egyszerre 10+ nagy request

  3. Kezdeti mount:
     - max ~${initialRender} ProductCard DOM (többi scrollra jön)

  4. Carousel swipe:
     - egy gyors flick = pontosan 1 kép váltás

  5. Long-press mobilon:
     - fullscreen viewer nyílik
     - nincs böngésző „Kép mentése” menü

  6. Viewer megnyitás:
     - csak aktív ±${preloadRadius} slide kér pdpViewer presetet
     - nagy kép csak nyitáskor töltődik

  7. PDP:
     - aktív slide: pdpMain ~640w, preload
     - szomszéd slide: pdpCarouselIdle ~200w lazy
     - távoli slide: placeholder, nincs request

  8. CLS:
     - feed kártya aspect-[4/5] — nincs layout ugrás
     - nincs fix width/height attr a PresetImage img-en

── Cél ──
  • Gyors első paint (kevés eager request)
  • Élesebb feed thumbnail (homepageFeed q70)
  • Stabil 1-gesztus-1-kép carousel
  • Vinted-szerű fullscreen böngészés long-pressre
`);
