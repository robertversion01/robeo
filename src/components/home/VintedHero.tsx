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

/** Vinted-szerű változó magasságok — mobilon nagyobb tömeg, desktopon még teltebb */
const TILE_HEIGHTS = [
  'h-[9.5rem] sm:h-[10.5rem] md:h-[11.5rem] lg:h-[12.5rem] xl:h-[13.5rem]',
  'h-[11rem] sm:h-[12rem] md:h-[13rem] lg:h-[14rem] xl:h-[15rem]',
  'h-[10rem] sm:h-[11rem] md:h-[12rem] lg:h-[13rem] xl:h-[14rem]',
  'h-[11.5rem] sm:h-[12.5rem] md:h-[13.5rem] lg:h-[14.5rem] xl:h-[15.5rem]',
  'h-[9rem] sm:h-[10rem] md:h-[11rem] lg:h-[12rem] xl:h-[13rem]',
  'h-[10.5rem] sm:h-[11.5rem] md:h-[12.5rem] lg:h-[13.5rem] xl:h-[14.5rem]',
  'h-[11.25rem] sm:h-[12.25rem] md:h-[13.25rem] lg:h-[14.25rem] xl:h-[15.25rem]',
  'h-[10.25rem] sm:h-[11.25rem] md:h-[12.25rem] lg:h-[13.25rem] xl:h-[14.25rem]',
];

const FLOAT_SECONDS = 9;
const COLUMN_TRAVEL = [68, 82, 74, 88, 76];

function primaryImageUrl(product: Product): string | null {
  return (
    product.image_url ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null) ||
    null
  );
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

function getLandingProducts(products: Product[]): HeroProduct[] {
  const withImages = products.filter((product) => Boolean(primaryImageUrl(product))) as HeroProduct[];
  const featured = getFeaturedProducts(withImages);
  return (featured.length > 0 ? featured : withImages).slice(0, 24);
}

function distributeColumns<T>(items: T[], columnCount: number): T[][] {
  const cols: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    cols[index % columnCount].push(item);
  });
  return cols;
}

function HeroImageTile({
  item,
  heightClass,
  priority,
}: {
  item: HeroProduct;
  heightClass: string;
  priority?: boolean;
}) {
  const url = primaryImageUrl(item);

  return (
    <Link
      href={`/products/${item.id}`}
      className={`landing-hero-tile block w-full shrink-0 overflow-hidden rounded-xl md:rounded-2xl ${heightClass}`}
    >
      {url ? (
        <img
          src={url}
          alt={item.name}
          className="h-full w-full object-cover"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#1a282c] text-xl text-gray-400">
          📦
        </div>
      )}
    </Link>
  );
}

function FloatingMasonryColumn({
  colIndex,
  loopItems,
  reducedMotion,
  hiddenClass,
}: {
  colIndex: number;
  loopItems: HeroProduct[];
  reducedMotion: boolean;
  hiddenClass?: string;
}) {
  const direction = colIndex % 2 === 0 ? 1 : -1;
  const travel = COLUMN_TRAVEL[colIndex % COLUMN_TRAVEL.length];

  return (
    <motion.div
      className={`landing-masonry-column flex min-h-0 flex-col gap-1 sm:gap-1.5 md:gap-2 ${hiddenClass ?? ''}`}
      initial={false}
      animate={reducedMotion ? undefined : { y: direction > 0 ? [0, -travel] : [-travel, 0] }}
      transition={
        reducedMotion
          ? undefined
          : {
              duration: FLOAT_SECONDS + colIndex * 0.6,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear',
            }
      }
    >
      {loopItems.map((item, idx) => (
        <HeroImageTile
          key={`${item.id}-${colIndex}-${idx}`}
          item={item}
          heightClass={TILE_HEIGHTS[(idx + colIndex) % TILE_HEIGHTS.length]}
          priority={colIndex < 2 && idx < 2}
        />
      ))}
    </motion.div>
  );
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

  const landingProducts = useMemo(() => getLandingProducts(products), [products]);
  const featuredProducts = useMemo(() => getFeaturedProducts(products).slice(0, 18), [products]);

  const floatingItems = useMemo(() => {
    if (landingProducts.length === 0) return [];
    return [...landingProducts, ...landingProducts, ...landingProducts];
  }, [landingProducts]);

  const featuredLoopItems = useMemo(() => {
    if (featuredProducts.length === 0) return [];
    return [...featuredProducts, ...featuredProducts];
  }, [featuredProducts]);

  const masonryColumns = useMemo(() => distributeColumns(floatingItems, 5), [floatingItems]);

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
      <section className="landing-hero-shell relative h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#0f1a1d] text-white">
        <GuestLandingHeader />

        {landingProducts.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 py-10 text-center text-sm text-gray-300">
            {t('landing.hero.empty')}
          </div>
        ) : (
          <>
            {/* Vinted: teljes viewport masonry, CTA alul overlay */}
            <div
              className="landing-hero-masonry absolute inset-0 z-0 overflow-hidden"
              aria-hidden={false}
            >
              <div className="landing-masonry-grid grid h-[115%] w-full grid-cols-3 gap-1 px-1.5 pt-[3.25rem] sm:gap-1.5 sm:px-2 md:grid-cols-4 md:gap-2 md:px-3 lg:grid-cols-5 lg:px-4">
                {masonryColumns.map((colItems, colIndex) => (
                  <FloatingMasonryColumn
                    key={`masonry-col-${colIndex}`}
                    colIndex={colIndex}
                    loopItems={colItems}
                    reducedMotion={!!reducedMotion}
                    hiddenClass={
                      colIndex === 3
                        ? 'hidden md:flex'
                        : colIndex === 4
                          ? 'hidden lg:flex'
                          : undefined
                    }
                  />
                ))}
              </div>
            </div>

            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-[#0f1a1d] via-[#0f1a1d]/70 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[min(58vh,28rem)] bg-gradient-to-t from-[#0f1a1d] via-[#0f1a1d]/92 to-transparent"
              aria-hidden
            />
          </>
        )}

        <div className="landing-hero-cta absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-6">
          <motion.h2
            className="mx-auto max-w-lg text-center font-serif text-[clamp(1.85rem,6.2vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.01em] text-white"
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
