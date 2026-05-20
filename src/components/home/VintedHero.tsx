'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/lib/utils';
import GuestLandingHeader from '@/components/home/GuestLandingHeader';
import type { Product } from '@/types';

interface VintedHeroProps {
  products: Product[];
  fullScreen?: boolean;
  compact?: boolean;
}

type HeroProduct = Product;

/** UI-only hero density — nem módosít backend / fetch logikát */
export const LANDING_HERO_POOL_MAX = 64;
export const LANDING_HERO_LOOP_REPEATS = 6;
export const LANDING_HERO_MIN_TILES_PER_COLUMN = 22;
export const LANDING_HERO_COLUMN_COUNT = 6;

type HeroTile = {
  product: HeroProduct;
  imageUrl: string;
  tileKey: string;
};

const TILE_HEIGHTS = [
  'h-[8.75rem] sm:h-[9.5rem] md:h-[10.5rem] lg:h-[11.5rem] xl:h-[12.5rem]',
  'h-[10rem] sm:h-[10.75rem] md:h-[11.75rem] lg:h-[12.75rem] xl:h-[13.75rem]',
  'h-[9.25rem] sm:h-[10rem] md:h-[11rem] lg:h-[12rem] xl:h-[13rem]',
  'h-[10.5rem] sm:h-[11.25rem] md:h-[12.25rem] lg:h-[13.25rem] xl:h-[14.25rem]',
  'h-[8.5rem] sm:h-[9.25rem] md:h-[10.25rem] lg:h-[11.25rem] xl:h-[12.25rem]',
  'h-[9.75rem] sm:h-[10.5rem] md:h-[11.5rem] lg:h-[12.5rem] xl:h-[13.5rem]',
  'h-[10.25rem] sm:h-[11rem] md:h-[12rem] lg:h-[13rem] xl:h-[14rem]',
  'h-[9.5rem] sm:h-[10.25rem] md:h-[11.25rem] lg:h-[12.25rem] xl:h-[13.25rem]',
  'h-[10.75rem] sm:h-[11.5rem] md:h-[12.5rem] lg:h-[13.5rem] xl:h-[14.5rem]',
  'h-[9rem] sm:h-[9.75rem] md:h-[10.75rem] lg:h-[11.75rem] xl:h-[12.75rem]',
];

const FLOAT_SECONDS = 7.5;
const COLUMN_TRAVEL = [92, 108, 96, 112, 100, 104];

function primaryImageUrl(product: Product): string | null {
  return (
    product.image_url ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null) ||
    null
  );
}

function collectImageUrls(product: HeroProduct): string[] {
  const urls: string[] = [];
  const push = (url: string | null | undefined) => {
    if (url && !urls.includes(url)) urls.push(url);
  };
  push(product.image_url);
  if (Array.isArray(product.images)) {
    for (const img of product.images) push(img);
  }
  return urls;
}

function getFeaturedProducts(products: Product[]): HeroProduct[] {
  const withImages = products.filter((product) => Boolean(primaryImageUrl(product))) as HeroProduct[];
  const now = Date.now();
  return withImages.filter(
    (product) =>
      typeof product.featured_until === 'string' &&
      new Date(product.featured_until).getTime() > now,
  );
}

/** Egyedi termékek poolja — max 64, kiemeltek elöl */
function buildHeroProductPool(products: Product[]): HeroProduct[] {
  const withImages = products.filter((product) => Boolean(primaryImageUrl(product))) as HeroProduct[];
  const featured = getFeaturedProducts(withImages);
  const pool: HeroProduct[] = [];
  const seen = new Set<string>();

  for (const product of [...featured, ...withImages]) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    pool.push(product);
    if (pool.length >= LANDING_HERO_POOL_MAX) break;
  }

  return pool;
}

/** Több kép / termék → sűrű tile lista (ugyanaz a termék link, több vizuális variáns) */
function buildHeroTiles(pool: HeroProduct[]): HeroTile[] {
  if (pool.length === 0) return [];

  const tiles: HeroTile[] = [];

  for (const product of pool) {
    const urls = collectImageUrls(product);
    const cap = Math.max(1, Math.min(3, urls.length));
    for (let i = 0; i < cap; i += 1) {
      tiles.push({
        product,
        imageUrl: urls[i],
        tileKey: `${product.id}-img-${i}`,
      });
    }
  }

  let guard = 0;
  while (tiles.length < Math.min(pool.length * 2, 96) && guard < 12) {
    for (const product of pool) {
      const url = primaryImageUrl(product);
      if (!url) continue;
      tiles.push({
        product,
        imageUrl: url,
        tileKey: `${product.id}-fill-${tiles.length}`,
      });
      if (tiles.length >= 96) break;
    }
    guard += 1;
  }

  return tiles;
}

function repeatTiles(tiles: HeroTile[], repeats: number): HeroTile[] {
  if (tiles.length === 0) return [];
  const out: HeroTile[] = [];
  for (let r = 0; r < repeats; r += 1) {
    for (let i = 0; i < tiles.length; i += 1) {
      const tile = tiles[i];
      out.push({
        ...tile,
        tileKey: `${tile.tileKey}-loop-${r}-${i}`,
      });
    }
  }
  return out;
}

function distributeColumns<T>(items: T[], columnCount: number): T[][] {
  const cols: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    cols[index % columnCount].push(item);
  });
  return cols;
}

function fillColumnTiles(tiles: HeroTile[], minTiles: number): HeroTile[] {
  if (tiles.length === 0) return [];
  const out: HeroTile[] = [];
  let i = 0;
  while (out.length < minTiles) {
    const source = tiles[i % tiles.length];
    out.push({
      ...source,
      tileKey: `${source.tileKey}-col-${out.length}`,
    });
    i += 1;
  }
  return out;
}

function HeroImageTile({
  tile,
  heightClass,
  priority,
}: {
  tile: HeroTile;
  heightClass: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/products/${tile.product.id}`}
      className={`landing-hero-tile block w-full shrink-0 overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl ${heightClass}`}
    >
      <img
        src={tile.imageUrl}
        alt={tile.product.name}
        className="h-full w-full object-cover"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </Link>
  );
}

function FloatingMasonryColumn({
  colIndex,
  tiles,
  reducedMotion,
  hiddenClass,
}: {
  colIndex: number;
  tiles: HeroTile[];
  reducedMotion: boolean;
  hiddenClass?: string;
}) {
  const direction = colIndex % 2 === 0 ? 1 : -1;
  const travel = COLUMN_TRAVEL[colIndex % COLUMN_TRAVEL.length];

  return (
    <motion.div
      className={`landing-masonry-column flex min-h-0 flex-col gap-0.5 sm:gap-1 md:gap-1.5 ${hiddenClass ?? ''}`}
      initial={false}
      animate={reducedMotion ? undefined : { y: direction > 0 ? [0, -travel] : [-travel, 0] }}
      transition={
        reducedMotion
          ? undefined
          : {
              duration: FLOAT_SECONDS + colIndex * 0.45,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear',
            }
      }
    >
      {tiles.map((tile, idx) => (
        <HeroImageTile
          key={tile.tileKey}
          tile={tile}
          heightClass={TILE_HEIGHTS[(idx + colIndex) % TILE_HEIGHTS.length]}
          priority={colIndex < 2 && idx < 3}
        />
      ))}
    </motion.div>
  );
}

function columnVisibilityClass(colIndex: number): string | undefined {
  if (colIndex >= 5) return 'hidden xl:flex';
  if (colIndex >= 4) return 'hidden lg:flex';
  if (colIndex >= 3) return 'hidden md:flex';
  return undefined;
}

export default function VintedHero({
  products,
  fullScreen = false,
  compact = false,
}: VintedHeroProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const autoplayRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const heroProductPool = useMemo(() => buildHeroProductPool(products), [products]);
  const heroTiles = useMemo(() => buildHeroTiles(heroProductPool), [heroProductPool]);
  const featuredProducts = useMemo(() => getFeaturedProducts(products).slice(0, 18), [products]);

  const masonryColumns = useMemo(() => {
    const looped = repeatTiles(heroTiles, LANDING_HERO_LOOP_REPEATS);
    const distributed = distributeColumns(looped, LANDING_HERO_COLUMN_COUNT);
    return distributed.map((col) => fillColumnTiles(col, LANDING_HERO_MIN_TILES_PER_COLUMN));
  }, [heroTiles]);

  const heroTileCount = useMemo(
    () => masonryColumns.reduce((sum, col) => sum + col.length, 0),
    [masonryColumns],
  );

  const featuredLoopItems = useMemo(() => {
    if (featuredProducts.length === 0) return [];
    return [...featuredProducts, ...featuredProducts];
  }, [featuredProducts]);

  useEffect(() => {
    if (fullScreen) return;
    const scroller = scrollerRef.current;
    if (!scroller || featuredProducts.length === 0) return;

    let paused = false;
    const speedPxPerSecond = 34;

    const tick = (timestamp: number) => {
      if (!scrollerRef.current) return;
      if (lastFrameRef.current === null) lastFrameRef.current = timestamp;
      const elapsedMs = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;

      if (!paused) {
        const el = scrollerRef.current;
        const half = el.scrollWidth / 2;
        el.scrollLeft += (elapsedMs / 1000) * speedPxPerSecond;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      autoplayRef.current = window.requestAnimationFrame(tick);
    };

    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };

    autoplayRef.current = window.requestAnimationFrame(tick);
    scroller.addEventListener('pointerdown', pause);
    scroller.addEventListener('pointerup', resume);
    scroller.addEventListener('pointercancel', resume);
    scroller.addEventListener('mouseenter', pause);
    scroller.addEventListener('mouseleave', resume);

    return () => {
      if (autoplayRef.current) window.cancelAnimationFrame(autoplayRef.current);
      autoplayRef.current = null;
      lastFrameRef.current = null;
      scroller.removeEventListener('pointerdown', pause);
      scroller.removeEventListener('pointerup', resume);
      scroller.removeEventListener('pointercancel', resume);
      scroller.removeEventListener('mouseenter', pause);
      scroller.removeEventListener('mouseleave', resume);
    };
  }, [featuredProducts.length, fullScreen]);

  if (fullScreen) {
    return (
      <section
        className="landing-hero-shell relative h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#0f1a1d] text-white"
        data-hero-pool-size={heroProductPool.length}
        data-hero-tile-count={heroTileCount}
      >
        <GuestLandingHeader />

        {heroProductPool.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 py-10 text-center text-sm text-gray-300">
            {t('landing.hero.empty')}
          </div>
        ) : (
          <>
            <div className="landing-hero-masonry absolute inset-0 z-0 overflow-hidden">
              <div className="landing-masonry-grid grid w-full grid-cols-3 gap-0.5 px-1 pt-[2.85rem] sm:gap-1 sm:px-1.5 md:grid-cols-4 md:gap-1 md:px-2 lg:grid-cols-5 lg:gap-1.5 lg:px-3 xl:grid-cols-6 xl:px-3.5">
                {masonryColumns.map((colTiles, colIndex) => (
                  <FloatingMasonryColumn
                    key={`masonry-col-${colIndex}`}
                    colIndex={colIndex}
                    tiles={colTiles}
                    reducedMotion={!!reducedMotion}
                    hiddenClass={columnVisibilityClass(colIndex)}
                  />
                ))}
              </div>
            </div>

            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-[#0f1a1d]/95 via-[#0f1a1d]/45 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[min(46vh,24rem)] bg-gradient-to-t from-[#0f1a1d] via-[#0f1a1d]/88 to-transparent"
              aria-hidden
            />
          </>
        )}

        <div className="landing-hero-cta absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
          <motion.h2
            className="mx-auto max-w-lg text-center font-serif text-[clamp(1.85rem,6.2vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.01em] text-white drop-shadow-sm"
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {t('landing.hero.titleLine1')}
            <br />
            {t('landing.hero.titleLine2')}
            <br />
            {t('landing.hero.titleLine3')}
          </motion.h2>

          <div className="mx-auto mt-4 max-w-md space-y-2.5 sm:mt-5">
            <Link
              href="/auth?mode=register"
              className="inline-flex h-[3.25rem] w-full items-center justify-center rounded-xl bg-[#4baab5] text-[1.05rem] font-semibold text-black touch-manipulation transition-transform active:scale-[0.99]"
            >
              {t('landing.hero.register')}
            </Link>
            <Link
              href="/auth?mode=login"
              className="inline-flex h-[3.25rem] w-full items-center justify-center rounded-xl border border-white/80 bg-black text-[1.05rem] font-semibold text-white touch-manipulation transition-transform active:scale-[0.99]"
            >
              {t('landing.hero.login')}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`w-full overflow-hidden ${compact ? 'mb-2 mt-0' : 'mb-3 mt-0'}`}>
      <div
        className={`rounded-xl border border-gray-200 bg-white ${
          compact ? 'p-1.5 shadow-sm' : 'p-2'
        }`}
      >
        {!compact ? (
          <div className="mb-2 px-1">
            <h2 className="text-sm font-semibold text-gray-900 md:text-base">Kiemelt ajánlatok</h2>
          </div>
        ) : (
          <div className="mb-1 flex items-center justify-between gap-2 px-0.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Kiemelt
            </h2>
          </div>
        )}
        {featuredProducts.length === 0 ? (
          <div
            className={`rounded-lg border border-dashed border-gray-300 text-center text-gray-500 ${
              compact ? 'px-3 py-4 text-xs' : 'px-4 py-8 text-sm'
            }`}
          >
            Nincs aktív kiemelt hirdetés.
          </div>
        ) : (
          <div
            ref={scrollerRef}
            className="flex cursor-grab gap-1.5 overflow-x-auto no-scrollbar active:cursor-grabbing sm:gap-2"
            style={{ willChange: 'scroll-position' }}
          >
            {featuredLoopItems.map((item, idx) => (
              <Link
                key={`${item.id}-${idx}`}
                href={`/products/${item.id}`}
                className={`shrink-0 rounded-lg border border-gray-200/90 bg-white p-0.5 transition-colors hover:border-[#007782]/45 ${
                  compact
                    ? 'w-[30%] min-w-[100px] sm:w-[22%] sm:min-w-[118px]'
                    : 'w-[37%] min-w-[132px] sm:w-[26%] md:w-[20%] lg:w-[14%]'
                }`}
              >
                <div className="flex h-full flex-col">
                  <div
                    className={`w-full overflow-hidden rounded-md bg-gray-100 ${
                      compact ? 'h-[112px] sm:h-[128px]' : 'h-[168px] sm:h-[182px]'
                    }`}
                  >
                    {primaryImageUrl(item) ? (
                      <img
                        src={primaryImageUrl(item)!}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                        📦
                      </div>
                    )}
                  </div>
                  <div
                    className={`flex flex-col px-0.5 ${
                      compact ? 'min-h-[44px] py-1' : 'min-h-[60px] space-y-0.5 py-1.5'
                    }`}
                  >
                    <p
                      className={`truncate font-extrabold tabular-nums text-[#007782] ${
                        compact ? 'text-[11px]' : 'text-xs'
                      }`}
                    >
                      {formatPrice(item.price)}
                    </p>
                    {!compact && (
                      <>
                        <p className="truncate text-[11px] text-gray-500">
                          Méret: {item.size || '—'}
                        </p>
                        <p className="truncate text-[11px] text-gray-700">
                          {item.brand || item.name}
                        </p>
                      </>
                    )}
                    {compact && (
                      <p className="truncate text-[10px] leading-tight text-gray-500">
                        {(item.brand || item.name)?.slice(0, 22)}
                        {(item.brand || item.name)?.length > 22 ? '…' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
