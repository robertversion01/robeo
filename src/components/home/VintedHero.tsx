'use client';

import { useMemo, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const heroProducts = useMemo(() => getHeroProducts(products), [products]);

  const scrollByPage = (direction: 'left' | 'right') => {
    if (!scrollerRef.current) return;
    const pageWidth = Math.round(scrollerRef.current.clientWidth * 0.92);
    scrollerRef.current.scrollBy({
      left: direction === 'left' ? -pageWidth : pageWidth,
      behavior: 'smooth',
    });
  };

  return (
    <section className="mb-4 md:mb-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-2.5 md:p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm md:text-base font-semibold text-gray-900">Kiemelt hirdetések</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollByPage('left')}
              className="h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center justify-center"
              aria-label="Előző"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage('right')}
              className="h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center justify-center"
              aria-label="Következő"
            >
              <ChevronRight size={16} />
            </button>
          </div>
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
            {heroProducts.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.id}`}
                className="snap-start shrink-0 w-[72%] sm:w-[44%] lg:w-[28%] rounded-xl overflow-hidden border border-gray-200 bg-white hover:border-[#007782]/40 transition-colors"
              >
                <div className="relative aspect-[4/5] bg-gray-100">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400">📦</div>
                  )}
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-sm font-semibold text-gray-900">{formatPrice(item.price)}</p>
                  <p className="mt-0.5 text-xs text-gray-600 truncate">{item.brand || item.name}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-col sm:flex-row items-center gap-2">
          <Link
            href="/auth"
            className="w-full sm:w-auto px-4 py-2 rounded-full bg-[#007782] text-white font-medium text-sm hover:bg-[#00616b] transition-colors text-center"
          >
            Eladni szeretnék
          </Link>
          <Link
            href="/auth"
            className="w-full sm:w-auto px-4 py-2 rounded-full border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors text-center"
          >
            Belépés
          </Link>
        </div>
      </div>
    </section>
  );
}
