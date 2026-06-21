/**
 * Közös galéria-gesztus konfig — feed kártya, PDP, fullscreen viewer.
 * Vinted-szerű: függőleges scroll első, 1 swipe = max 1 kép.
 */
export const GALLERY_GESTURE = {
  scrollSettleMs: 32,
  swipeCommitRatio: 0.28,
  swipeCommitMinPx: 52,
  axisDecidePx: 14,
  horizontalDominance: 1.35,
  horizontalLockPx: 32,
  longPressMs: 450,
  longPressJitterPx: 12,
  carouselCancelDx: 32,
  preloadViewerMs: 180,
  longPressVibrateMs: 12,
} as const;

/** Tailwind osztályok — globals.css `.product-gallery-surface` / `.product-card-carousel` */
export const GALLERY_SURFACE_CLASS = 'product-gallery-surface';
export const GALLERY_CAROUSEL_CLASS =
  'product-card-carousel flex h-full w-full snap-x snap-mandatory overscroll-x-contain no-scrollbar';
export const GALLERY_VIEWER_CAROUSEL_CLASS =
  'product-card-carousel relative min-h-0 w-full flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-none no-scrollbar';
