'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types';

interface VintedHeroProps {
  products: Product[];
  fullScreen?: boolean;
  /** Bejelentkezett főoldal: alacsonyabb kiemelt sáv */
  compact?: boolean;
}

type HeroProduct = Product;

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
      new Date(product.featured_until).getTime() > now
  );
}

function getLandingProducts(products: Product[]): HeroProduct[] {
  const withImages = products.filter((product) => Boolean(primaryImageUrl(product))) as HeroProduct[];
  const featured = getFeaturedProducts(withImages);

  return (featured.length > 0 ? featured : withImages).slice(0, 12);
}

export default function VintedHero({
  products,
  fullScreen = false,
  compact = false,
}: VintedHeroProps) {
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

  const columnHeights = ['h-28', 'h-36', 'h-32', 'h-40', 'h-30', 'h-36'];

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
        if (el.scrollLeft >= half) {
          el.scrollLeft -= half;
        }
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

  return (
    <section
      className={`overflow-hidden w-full ${
        fullScreen ? 'min-h-[calc(100svh-3.5rem)]' : compact ? 'mb-2 mt-0' : 'mb-3 mt-0'
      }`}
    >
      {fullScreen ? (
        <div className="bg-[#0f1a1d] text-white border border-[#1f2c30] overflow-hidden w-full min-h-[calc(100svh-3.5rem)] rounded-none border-x-0 border-b-0">
          {floatingItems.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-300">
              Még nincs kiemelt termék.
            </div>
          ) : (
            <div className="relative overflow-hidden h-full px-2 pt-0 pb-[22.5rem]">
              <div className="pointer-events-none absolute inset-0 px-2 pt-0 pb-[22.5rem]">
                <div className="grid grid-cols-3 gap-2 h-full floating-masonry">
                  {[0, 1, 2].map((col) => (
                    <div key={col} className={`flex flex-col gap-2 ${col === 1 ? 'floating-masonry-col-mid' : 'floating-masonry-col'}`}>
                      {floatingItems
                        .filter((_, index) => index % 3 === col)
                        .map((item, idx) => (
                          <Link
                            key={`${item.id}-${col}-${idx}`}
                            href={`/products/${item.id}`}
                            className={`block w-full ${columnHeights[(idx + col) % columnHeights.length]} rounded-2xl overflow-hidden`}
                          >
                            {primaryImageUrl(item) ? (
                              <img
                                src={primaryImageUrl(item)!}
                                alt={item.name}
                                className="h-full w-full object-cover opacity-90"
                                loading="lazy"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gray-700 text-gray-300 text-xl">
                                📦
                              </div>
                            )}
                          </Link>
                        ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0f1a1d] to-transparent" />
            </div>
          )}

          <div className="z-10 px-4 pt-3 sm:px-5 pb-6 pt-4">
            <h2 className="text-4xl leading-tight font-semibold font-serif text-white text-center">
              Csatlakozz, és add el
              <br />
              egykor kedvelt cuccaidat
              <br />
              díjmentesen
            </h2>

            <div className="mt-5 space-y-2.5">
              <Link
                href="/auth?mode=register"
                className="w-full h-12 rounded-xl bg-[#4baab5] text-black text-base font-semibold inline-flex items-center justify-center"
              >
                Regisztrálás a Robeo rendszerébe
              </Link>
              <Link
                href="/auth?mode=login"
                className="w-full h-12 rounded-xl border border-white/75 bg-black text-white text-base font-semibold inline-flex items-center justify-center"
              >
                Már rendelkezem fiókkal
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-xl border border-gray-200 bg-white ${
            compact ? 'p-1.5 shadow-sm' : 'p-2'
          }`}
        >
          {!compact ? (
            <div className="mb-2 px-1">
              <h2 className="text-sm md:text-base font-semibold text-gray-900">Kiemelt ajánlatok</h2>
            </div>
          ) : (
            <div className="mb-1 px-0.5 flex items-center justify-between gap-2">
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
              className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing"
              style={{ willChange: 'scroll-position' }}
            >
              {featuredLoopItems.map((item, idx) => (
                <Link
                  key={`${item.id}-${idx}`}
                  href={`/products/${item.id}`}
                  className={`shrink-0 rounded-lg border border-gray-200/90 bg-white p-0.5 hover:border-[#007782]/45 transition-colors ${
                    compact
                      ? 'w-[30%] min-w-[100px] sm:w-[22%] sm:min-w-[118px]'
                      : 'w-[37%] sm:w-[26%] md:w-[20%] lg:w-[14%] min-w-[132px]'
                  }`}
                >
                  <div className="flex flex-col h-full">
                    <div
                      className={`w-full rounded-md overflow-hidden bg-gray-100 ${
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
                        <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-400">
                          📦
                        </div>
                      )}
                    </div>
                    <div
                      className={`px-0.5 flex flex-col ${
                        compact ? 'py-1 min-h-[44px]' : 'py-1.5 space-y-0.5 min-h-[60px]'
                      }`}
                    >
                      <p
                        className={`font-extrabold text-[#007782] tabular-nums truncate ${
                          compact ? 'text-[11px]' : 'text-xs'
                        }`}
                      >
                        {formatPrice(item.price)}
                      </p>
                      {!compact && (
                        <>
                          <p className="text-[11px] text-gray-500 truncate">
                            Méret: {item.size || '—'}
                          </p>
                          <p className="text-[11px] text-gray-700 truncate">{item.brand || item.name}</p>
                        </>
                      )}
                      {compact && (
                        <p className="text-[10px] text-gray-500 truncate leading-tight">
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
      )}
    </section>
  );
}
