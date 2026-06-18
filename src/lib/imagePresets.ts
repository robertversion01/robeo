/**
 * Vinted-szerű képméretek — kis megjelenítési doboz = kis transform.
 * Mobilon ~50vw feed ≈ 170px → max 180w @ q50 (2x DPR ≈ 140–180w srcset).
 */
import {
  getOptimizedImageSrcSet,
  getOptimizedImageUrl,
  type SupabaseTransformOptions,
} from '@/lib/imageUtils';

export const IMAGE_QUALITY = {
  homepageFeed: 70,
  feed: 58,
  rail: 48,
  thumb: 46,
  pdp: 66,
  pdpViewer: 76,
  avatar: 52,
  hero: 58,
} as const;

/** Első viewport kártyák: eager + fetchpriority high. */
export const FEED_VIEWPORT_PRIORITY_COUNT = 6;

/** Kezdeti grid mount — kevesebb párhuzamos képrequest. */
export const FEED_INITIAL_RENDER_COUNT = 12;

/** Carousel / viewer: ±N slide tölt nagyobb presetből. */
export const IMAGE_VIEWPORT_PRELOAD_RADIUS = 1;

export type ImageLazyPolicy = 'lazy' | 'eager' | 'inherit';

type ImagePreset = {
  width: number;
  quality: number;
  options?: SupabaseTransformOptions;
  srcSetWidths: number[];
  sizes: string;
  /** Alapértelmezett betöltési viselkedés — priority prop felülírja. */
  lazyPolicy: ImageLazyPolicy;
  fetchPriority: 'high' | 'low' | 'auto';
};

/** Várható byte-budget / kép (WebP, mobilon) — CI audit célra. */
export const IMAGE_BYTE_BUDGETS: Record<string, { maxKb: number; note: string }> = {
  homepageFeed: { maxKb: 28, note: 'Főoldal feed ~320w q70' },
  feedCard: { maxKb: 20, note: 'Browse feed ~220w q58' },
  railCard: { maxKb: 10, note: 'Hasonló termék rail ~96w' },
  pdpMain: { maxKb: 50, note: 'PDP aktív slide ~640w' },
  pdpCarouselIdle: { maxKb: 10, note: 'PDP inaktív slide ~200w' },
  pdpViewer: { maxKb: 95, note: 'Fullscreen viewer ~1080w' },
  heroTile: { maxKb: 10, note: 'Hero masonry ~130w' },
  profileGrid: { maxKb: 16, note: 'Profil grid ~150w' },
};

export const IMAGE_PRESETS = {
  /** Főoldal feed — élesebb thumbnail, width-only transform */
  homepageFeed: {
    width: 320,
    quality: IMAGE_QUALITY.homepageFeed,
    options: { format: 'webp' },
    srcSetWidths: [240, 280, 320, 400, 480],
    sizes: '(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 20vw',
    lazyPolicy: 'lazy',
    fetchPriority: 'low',
  },
  /** Browse / kedvencek */
  feedCard: {
    width: 220,
    quality: IMAGE_QUALITY.feed,
    options: { format: 'webp' },
    srcSetWidths: [180, 220, 280, 340],
    sizes: '(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw',
    lazyPolicy: 'lazy',
    fetchPriority: 'low',
  },
  pdpMain: {
    width: 640,
    quality: IMAGE_QUALITY.pdp,
    options: { height: 800, resize: 'contain', format: 'webp' },
    srcSetWidths: [400, 520, 640, 800],
    sizes: '(max-width: 768px) 100vw, 50vw',
    lazyPolicy: 'eager',
    fetchPriority: 'high',
  },
  pdpCarouselIdle: {
    width: 200,
    quality: 52,
    options: { height: 250, resize: 'contain', format: 'webp' },
    srcSetWidths: [160, 200, 260],
    sizes: '100vw',
    lazyPolicy: 'lazy',
    fetchPriority: 'low',
  },
  pdpViewer: {
    width: 1080,
    quality: IMAGE_QUALITY.pdpViewer,
    options: { height: 1350, resize: 'contain', format: 'webp' },
    srcSetWidths: [720, 900, 1080, 1280],
    sizes: '100vw',
    lazyPolicy: 'inherit',
    fetchPriority: 'high',
  },
  pdpThumb: {
    width: 64,
    quality: IMAGE_QUALITY.thumb,
    options: { height: 64, resize: 'cover', format: 'webp' },
    srcSetWidths: [48, 64],
    sizes: '64px',
    lazyPolicy: 'lazy',
    fetchPriority: 'low',
  },
  heroTile: {
    width: 130,
    quality: IMAGE_QUALITY.hero,
    options: { height: 168, resize: 'cover', format: 'webp' },
    srcSetWidths: [100, 130, 170],
    sizes: '(max-width: 640px) 30vw, (max-width: 1024px) 18vw, 14vw',
    lazyPolicy: 'inherit',
    fetchPriority: 'high',
  },
  featuredStrip: {
    width: 88,
    quality: 48,
    options: { height: 110, resize: 'cover', format: 'webp' },
    srcSetWidths: [72, 88, 110],
    sizes: '88px',
    lazyPolicy: 'lazy',
    fetchPriority: 'low',
  },
  railCard: {
    width: 96,
    quality: IMAGE_QUALITY.rail,
    options: { height: 120, resize: 'contain', format: 'webp' },
    srcSetWidths: [72, 96, 120],
    sizes: '96px',
    lazyPolicy: 'lazy',
    fetchPriority: 'low',
  },
  profileGrid: {
    width: 150,
    quality: 52,
    options: { height: 188, resize: 'contain', format: 'webp' },
    srcSetWidths: [120, 150, 180],
    sizes: '(max-width: 640px) 45vw, 22vw',
    lazyPolicy: 'lazy',
    fetchPriority: 'low',
  },
  chatThumb: {
    width: 80,
    quality: 48,
    options: { height: 80, resize: 'cover', format: 'webp' },
    srcSetWidths: [64, 80, 96],
    sizes: '80px',
    lazyPolicy: 'lazy',
    fetchPriority: 'low',
  },
  avatar: {
    width: 28,
    quality: IMAGE_QUALITY.avatar,
    options: { height: 28, resize: 'cover', format: 'webp' },
    srcSetWidths: [28],
    sizes: '28px',
    lazyPolicy: 'lazy',
    fetchPriority: 'low',
  },
} as const satisfies Record<string, ImagePreset>;

/** @deprecated use profileGrid */
export const profileListing = IMAGE_PRESETS.profileGrid;

export type ImagePresetName = keyof typeof IMAGE_PRESETS;

export type ResolvedPresetImage = {
  src: string;
  srcSet: string | undefined;
  avifSrcSet: string | undefined;
  sizes: string;
  width: number;
  height: number;
  loading: 'lazy' | 'eager';
  fetchPriority: 'high' | 'low' | 'auto';
  placeholder: string;
};

function withFormat(
  options: SupabaseTransformOptions | undefined,
  format: 'webp' | 'avif',
): SupabaseTransformOptions {
  return { ...options, format };
}

export function imageFromPreset(
  url: string | null,
  preset: ImagePresetName,
  overrides?: { priority?: boolean; lazy?: boolean },
): ResolvedPresetImage {
  const p = IMAGE_PRESETS[preset];
  const webpOpts = withFormat(p.options, 'webp');
  const avifOpts = withFormat(p.options, 'avif');
  const widths = [...p.srcSetWidths];

  const priority = overrides?.priority === true;
  const lazyExplicit = overrides?.lazy;

  let loading: 'lazy' | 'eager' = 'lazy';
  if (priority || p.lazyPolicy === 'eager') {
    loading = 'eager';
  } else if (lazyExplicit === true || p.lazyPolicy === 'lazy') {
    loading = 'lazy';
  } else if (lazyExplicit === false) {
    loading = 'eager';
  }

  const fetchPriority: 'high' | 'low' | 'auto' =
    priority || p.fetchPriority === 'high' ? 'high' : p.fetchPriority === 'low' ? 'low' : 'auto';

  return {
    src: getOptimizedImageUrl(url, p.width, p.quality, webpOpts),
    srcSet: getOptimizedImageSrcSet(url, widths, p.quality, webpOpts),
    avifSrcSet: getOptimizedImageSrcSet(url, widths, p.quality, avifOpts),
    sizes: p.sizes,
    width: p.width,
    height:
      p.options && 'height' in p.options && typeof p.options.height === 'number'
        ? p.options.height
        : Math.round(p.width * 1.25),
    loading,
    fetchPriority,
    placeholder: getOptimizedImageUrl(url, 20, 38, {
      ...webpOpts,
      height:
        p.options && 'height' in p.options && typeof p.options.height === 'number'
          ? Math.max(20, Math.round(p.options.height / 10))
          : 20,
      resize: 'cover',
    }),
  };
}

/** Apró blur placeholder — azonnali vizuális kitöltés (LQIP). */
export function imagePlaceholderFromPreset(url: string | null, preset: ImagePresetName) {
  return imageFromPreset(url, preset).placeholder;
}
