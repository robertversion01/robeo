'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types';

interface VintedHeroProps {
  products: Product[];
}

type HeroProduct = Product & {
  featured?: boolean;
  is_featured?: boolean;
};

function getHeroProducts(products: Product[]): HeroProduct[] {
  const withImages = products.filter((product) => Boolean(product.image_url)) as HeroProduct[];
  const now = Date.now();
  const featured = withImages.filter(
    (product) =>
      typeof product.featured_until === 'string' &&
      new Date(product.featured_until).getTime() > now
  );

  return (featured.length > 0 ? featured : withImages).slice(0, 12);
}

export default function VintedHero({ products }: VintedHeroProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const autoplayRef = useRef<number | null>(null);
  const heroProducts = useMemo(() => getHeroProducts(products), [products]);
  const marqueeItems = useMemo(() => [...heroProducts, ...heroProducts], [heroProducts]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || heroProducts.length === 0) return;

    let paused = false;

    const startAuto = () => {
      if (autoplayRef.current) return;
      autoplayRef.current = window.setInterval(() => {
        if (!scrollerRef.current || paused) return;
        const el = scrollerRef.current;
        const half = el.scrollWidth / 2;
        el.scrollLeft += 0.9;
        if (el.scrollLeft >= half) {
          el.scrollLeft = 0;
        }
      }, 24);
    };

    const stopAuto = () => {
      if (autoplayRef.current) {
        window.clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };

    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };

    startAuto();
    scroller.addEventListener('mouseenter', pause);
    scroller.addEventListener('mouseleave', resume);
    scroller.addEventListener('pointerdown', pause);
    scroller.addEventListener('pointerup', resume);
    scroller.addEventListener('pointercancel', resume);
    scroller.addEventListener('touchstart', pause, { passive: true });
    scroller.addEventListener('touchend', resume, { passive: true });

    return () => {
      stopAuto();
      scroller.removeEventListener('mouseenter', pause);
      scroller.removeEventListener('mouseleave', resume);
      scroller.removeEventListener('pointerdown', pause);
      scroller.removeEventListener('pointerup', resume);
      scroller.removeEventListener('pointercancel', resume);
      scroller.removeEventListener('touchstart', pause);
      scroller.removeEventListener('touchend', resume);
    };
  }, [heroProducts.length]);

  return (
    <section className="mb-2.5">
      <div className="rounded-xl border border-gray-200 bg-white p-2">
        <div className="mb-1.5">
          <h2 className="text-sm md:text-base font-semibold text-gray-900">Kiemelt ajánlatok</h2>
        </div>

        {heroProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 text-center">
            Még nincs kiemelt termék.
          </div>
        ) : (
          <div
            ref={scrollerRef}
            className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing"
          >
            {marqueeItems.map((item, idx) => (
              <Link
                key={`${item.id}-${idx}`}
                href={`/products/${item.id}`}
                className="snap-start shrink-0 w-[38%] sm:w-[26%] lg:w-[16%] rounded-lg overflow-hidden border border-gray-200 bg-white hover:border-[#007782]/40 transition-colors"
              >
                <div className="relative h-[180px] md:h-[220px] bg-gray-100">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400">📦</div>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-gray-900">{formatPrice(item.price)}</p>
                  <p className="mt-0.5 text-[11px] text-gray-600 truncate">{item.brand || item.name}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
