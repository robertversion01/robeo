#!/usr/bin/env node
/**
 * Vinted-azonosság checklist — automatizált ellenőrzés (forráskód + HTTP).
 * Futtatás: node scripts/vinted-parity-check.mjs [baseUrl]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const base = process.argv[2]?.replace(/\/$/, '') || 'http://localhost:3000';

function readSrc(rel) {
  const p = join(root, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

function has(rel, pattern) {
  const src = readSrc(rel);
  if (typeof pattern === 'string') return src.includes(pattern);
  return pattern.test(src);
}

const results = [];

function check(id, area, label, pass, detail = '') {
  results.push({ id, area, label, pass, detail });
}

// ── 1) Home ──
check(
  '1.1',
  'Home',
  'Search-first vendég mobil (feed hero előtt)',
  has('src/components/home/HomePageClient.tsx', 'isDesktopLayout') &&
    has('src/components/home/HomePageClient.tsx', 'variant="feed"') &&
    has('src/components/home/HomePageClient.tsx', 'VintedHero'),
  'Egyetlen feed mount mobilon, hero csak desktopon',
);

check(
  '1.2',
  'Home',
  'Above-the-fold kereső mobilon',
  has('src/components/layout/MobileFeedChrome.tsx', 'CatalogSearchBar') &&
    has('src/components/layout/MobileFeedChrome.tsx', 'sticky top-0'),
  'MobileFeedChrome sticky kereső + kategória chip',
);

check(
  '1.3',
  'Home',
  'Bejelentkezett mobil feed (immersive)',
  has('src/lib/navVisibility.ts', "pathname === '/' && loggedIn") &&
    has('src/components/browse/CatalogBrowsePanel.tsx', "variant === 'feed'"),
);

check(
  '1.4',
  'Home',
  'Feed kártya compact ritmus',
  has('src/components/product/ProductGrid.tsx', 'compact') &&
    has('src/components/product/ProductGrid.tsx', 'grid-cols-2') &&
    has('src/components/product/ProductGrid.tsx', 'gap-0.5'),
);

check(
  '1.4b',
  'Home',
  'Lapos feed kártya (nincs border/shadow compact)',
  has('src/components/product/ProductCard.tsx', 'product-feed-card') &&
    has('src/app/globals.css', 'product-feed-card') &&
    has('src/components/product/ProductGridSkeleton.tsx', 'gap-0.5'),
);

check(
  '1.4c',
  'Home',
  'Compact feed: nincs kategória sor',
  has('src/components/product/ProductCard.tsx', '!compact && categoryShort'),
);

check(
  '1.5',
  'Home',
  '2 oszlop mobil grid',
  has('src/hooks/useProductGridColumns.ts', 'return 2'),
);

check(
  '1.6',
  'Home',
  'Desktop hero + katalógus',
  has('src/components/home/HomePageClient.tsx', 'VintedHero') &&
    has('src/components/home/HomePageClient.tsx', 'landing.catalog.title'),
);

// ── 2) Keresés ──
check(
  '2.1',
  'Keresés',
  'Kép alapú keresés (CTA + API)',
  existsSync(join(root, 'src/components/browse/VisualSearchCta.tsx')) &&
    has('src/components/layout/MobileFeedChrome.tsx', 'VisualSearchCta') &&
    existsSync(join(root, 'src/app/api/search/visual/route.ts')),
);

check(
  '2.1b',
  'Keresés',
  'Visual search hook/util',
  existsSync(join(root, 'src/hooks/useVisualSearch.ts')) &&
    existsSync(join(root, 'src/lib/visualSearchClient.ts')),
);

check(
  '2.2',
  'Keresés',
  'Typeahead debounce + min 2 char',
  has('src/components/browse/CatalogSearchBar.tsx', 'query.length < 2') &&
    has('src/components/browse/CatalogSearchBar.tsx', '220'),
);

check(
  '2.2b',
  'Keresés',
  'Typeahead thumbnail + ár',
  has('src/components/browse/CatalogSearchBar.tsx', 'PresetImage') &&
    has('src/lib/listedProducts.ts', 'image_url') &&
    has('src/components/browse/CatalogSearchBar.tsx', 'formatPrice'),
);

check(
  '2.3',
  'Keresés',
  'Zero-results rescue',
  has('src/components/product/ProductGrid.tsx', 'ZeroResultsRescue') &&
    existsSync(join(root, 'src/components/browse/ZeroResultsRescue.tsx')) &&
    has('src/components/browse/ZeroResultsRescue.tsx', 'rescueTryLabel') &&
    has('src/components/browse/ZeroResultsRescue.tsx', 'rescueRailLabel'),
);

check(
  '2.4',
  'Keresés',
  'Mobil filterek + ActiveFilterBar',
  has('src/components/browse/CatalogBrowsePanel.tsx', '<Filters') &&
    has('src/components/browse/CatalogBrowsePanel.tsx', 'ActiveFilterBar'),
);

check(
  '2.4b',
  'Keresés',
  'Filter compact + sheet layout',
  has('src/components/product/Filters.tsx', "layout?: 'inline' | 'compact' | 'sheet'") &&
    has('src/components/product/Filters.tsx', 'allFilters') &&
    has('src/components/browse/ImmersiveFilterSheet.tsx', 'layout="sheet"'),
);

check(
  '2.5',
  'Keresés',
  'Kategória chip számok',
  has('src/components/browse/CategoryQuickChips.tsx', 'categoryCounts') &&
    has('src/components/layout/MobileFeedChrome.tsx', 'categoryCounts'),
);

// ── 3) Képélmény ──
check(
  '3.1',
  'Kép',
  'Tap → PDP',
  has('src/hooks/useImageGalleryGestures.ts', 'onTap'),
);

check(
  '3.2',
  'Kép',
  'Long-press → viewer (~450ms)',
  has('src/lib/galleryGestureConfig.ts', 'longPressMs: 450') &&
    has('src/hooks/useImageGalleryGestures.ts', 'galleryGestureConfig') &&
    has('src/context/FeedImageViewerContext.tsx', 'ProductImageViewer'),
);

check(
  '3.3',
  'Kép',
  'Viewer horizontál swipe',
  has('src/components/product/ProductImageViewer.tsx', 'GALLERY_VIEWER_CAROUSEL_CLASS'),
);

check(
  '3.4',
  'Kép',
  '1 gesztus = max 1 kép',
  has('src/hooks/useSnapCarousel.ts', 'clampToGestureWindow') &&
    has('src/lib/galleryGestureConfig.ts', 'swipeCommitMinPx: 52'),
);

check(
  '3.4b',
  'Kép',
  'Shared galleryGestureConfig (feed/PDP/viewer)',
  has('src/lib/galleryGestureConfig.ts', 'GALLERY_GESTURE') &&
    has('src/hooks/useSnapCarousel.ts', 'galleryGestureConfig') &&
    has('src/components/product/ProductCard.tsx', 'GALLERY_CAROUSEL_CLASS') &&
    has('src/app/products/[id]/page.tsx', 'GALLERY_SURFACE_CLASS'),
);

check(
  '3.5',
  'Kép',
  'Vertical scroll priority',
  has('src/hooks/useSnapCarousel.ts', 'vertical') &&
    has('src/app/globals.css', 'product-gallery-surface'),
);

check(
  '3.6',
  'Kép',
  'Pinch / double-tap zoom',
  has('src/components/product/ProductImageViewer.tsx', 'usePinchZoom'),
);

check(
  '3.7',
  'Kép',
  'Viewer close + scroll lock',
  has('src/components/product/ProductImageViewer.tsx', 'onClose') &&
    has('src/components/product/ProductImageViewer.tsx', 'useBodyScrollLock'),
);

check(
  '3.8',
  'Kép',
  'PDP galéria carousel',
  has('src/app/products/[id]/page.tsx', 'useImageGalleryGestures') &&
    has('src/app/products/[id]/page.tsx', 'GALLERY_CAROUSEL_CLASS'),
);

// ── 4) Trust ──
check(
  '4.1',
  'Trust',
  'Feed kártyán compact trust sor (★ vagy verified)',
  has('src/components/product/ProductCard.tsx', 'showCompactTrust') &&
    has('src/components/product/ProductCard.tsx', 'sellerAvgRating'),
);

check(
  '4.2',
  'Trust',
  'PDP SellerTrustPanel above fold',
  has('src/app/products/[id]/page.tsx', 'SellerTrustPanel') &&
    has('src/app/products/[id]/page.tsx', 'ProductPriceAnchor'),
);

check(
  '4.2b',
  'Trust',
  'PDP compact trust strip + skeleton',
  has('src/app/products/[id]/page.tsx', 'variant="compact"') &&
    has('src/components/profile/SellerTrustPanel.tsx', 'TrustSkeleton'),
);

check(
  '4.3',
  'Trust',
  'Verified badge komponens',
  has('src/components/profile/SellerTrustPanel.tsx', 'verified'),
);

check(
  '4.4',
  'Trust',
  'Rating csillag',
  has('src/components/profile/SellerTrustPanel.tsx', 'StarRating'),
);

check(
  '4.5',
  'Trust',
  'Ár kontextus (price anchor)',
  existsSync(join(root, 'src/components/product/ProductPriceAnchor.tsx')),
);

check(
  '4.6',
  'Trust',
  'Response time szöveg',
  has('src/components/profile/SellerTrustPanel.tsx', 'responseWithinHours'),
);

// ── 5) Performancia ──
check(
  '5.1',
  'Perf',
  'LCP preload feed',
  existsSync(join(root, 'src/components/product/FeedLcpPreloader.tsx')),
);

check(
  '5.2',
  'Perf',
  'Virtual scroll (≥5 sor)',
  has('src/components/product/ProductGrid.tsx', 'useWindowVirtualizer') &&
    has('src/components/product/ProductGrid.tsx', 'VIRTUAL_MIN_ROWS = 5'),
);

check(
  '5.3',
  'Perf',
  'Service Worker SWR',
  existsSync(join(root, 'public/sw.js')) &&
    has('public/sw.js', 'stale-while-revalidate'),
);

check(
  '5.4',
  'Perf',
  'Early Hints middleware',
  existsSync(join(root, 'src/middleware.ts')) &&
    existsSync(join(root, 'src/lib/feedEarlyHints.ts')),
);

check(
  '5.5',
  'Perf',
  'View transition card→PDP',
  existsSync(join(root, 'src/lib/productViewTransition.ts')) &&
    has('src/lib/productViewTransition.ts', 'shouldUseProductViewTransition'),
);

check(
  '5.6',
  'Perf',
  'Viewer preload long-press alatt',
  has('src/hooks/useImageGalleryGestures.ts', 'PRELOAD_VIEWER_MS'),
);

check(
  '5.7',
  'Perf',
  'Duplikált grid mount elkerülése (guest home)',
  !has('src/components/home/HomePageClient.tsx', 'md:hidden') ||
    has('src/components/home/HomePageClient.tsx', 'isDesktopLayout'),
  'HomePageClient: egyetlen CatalogBrowsePanel mount viewport szerint',
);

// ── HTTP smoke ──
async function httpCheck(path, method = 'GET', body) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'follow',
    });
    const text = await res.text();
    return { status: res.status, ok: res.status < 500, text: text.slice(0, 5000) };
  } catch (e) {
    return { status: 0, ok: false, text: String(e) };
  }
}

const home = await httpCheck('/');
check(
  'H.1',
  'HTTP',
  'Főoldal elérhető',
  home.ok && home.status === 200,
  `status ${home.status}`,
);

const browse = await httpCheck('/browse');
check(
  'H.2',
  'HTTP',
  '/browse elérhető',
  browse.ok && browse.status === 200,
  `status ${browse.status}`,
);

const visual = await httpCheck('/api/search/visual', 'POST', {});
check(
  'H.3',
  'HTTP',
  'Visual search API válaszol (400/503 OK)',
  visual.status === 400 || visual.status === 503 || visual.status === 200,
  `status ${visual.status}`,
);

const sw = await httpCheck('/sw.js');
check(
  'H.4',
  'HTTP',
  'Service worker fájl',
  sw.ok && sw.text.includes('fetch'),
  `status ${sw.status}`,
);

// ── Report ──
let pass = 0;
let fail = 0;
let warn = 0;
const byArea = new Map();

for (const r of results) {
  if (!byArea.has(r.area)) byArea.set(r.area, []);
  byArea.get(r.area).push(r);
}

console.log('\n=== Vinted-azonosság checklist ===\n');
for (const [area, rows] of byArea) {
  console.log(`## ${area}`);
  for (const r of rows) {
    const tag = !r.pass ? 'FAIL' : 'PASS';
    if (!r.pass) fail += 1;
    else pass += 1;
    console.log(`  [${tag}] ${r.id} ${r.label}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  console.log('');
}

console.log(`Összesen: ${pass} PASS, ${fail} FAIL / ${results.length}\n`);
process.exit(fail > 0 ? 1 : 0);
