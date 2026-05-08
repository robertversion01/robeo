'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Product } from '@/types';

interface VintedHeroProps {
  products: Product[];
  fullScreen?: boolean;
}

type HeroProduct = Product;

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

export default function VintedHero({ products, fullScreen = false }: VintedHeroProps) {
  const heroProducts = useMemo(() => getHeroProducts(products), [products]);
  const floatingItems = useMemo(() => {
    if (heroProducts.length === 0) return [];
    return [...heroProducts, ...heroProducts, ...heroProducts];
  }, [heroProducts]);

  const columnHeights = ['h-28', 'h-36', 'h-32', 'h-40', 'h-30', 'h-36'];

  return (
    <section className={`overflow-hidden w-full ${fullScreen ? 'h-screen' : 'mb-3'}`}>
      <div className={`bg-[#0f1a1d] text-white border border-[#1f2c30] overflow-hidden w-full ${fullScreen ? 'h-full rounded-none border-x-0 border-b-0' : 'rounded-2xl'}`}>
        {floatingItems.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-300">
            Még nincs kiemelt termék.
          </div>
        ) : (
          <div className={`relative overflow-hidden ${fullScreen ? 'h-full px-2 pt-0 pb-[22.5rem]' : 'h-[270px] sm:h-[330px] px-2 pt-2'}`}>
            <div className={`pointer-events-none absolute inset-0 ${fullScreen ? 'px-2 pt-0 pb-[22.5rem]' : 'p-2'}`}>
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
                          {item.image_url ? (
                            <img
                              src={item.image_url}
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

        <div className={`z-10 px-4 pt-3 sm:px-5 ${fullScreen ? 'fixed bottom-0 left-0 right-0 bg-[#0f1a1d] pb-6 pt-4' : 'relative pb-4 sm:pb-5'}`}>
          <h2 className="text-4xl leading-tight font-semibold font-serif text-white text-center">
            Csatlakozz, és add el
            <br />
            egykor kedvelt cuccaidat
            <br />
            díjmentesen
          </h2>

          <div className="mt-5 space-y-2.5">
            <Link
              href="/auth"
              className="w-full h-12 rounded-xl bg-[#4baab5] text-black text-base font-semibold inline-flex items-center justify-center"
            >
              Regisztrálás a Robeo rendszerébe
            </Link>
            <Link
              href="/auth"
              className="w-full h-12 rounded-xl border border-white/75 bg-black text-white text-base font-semibold inline-flex items-center justify-center"
            >
              Már rendelkezem fiókkal
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
