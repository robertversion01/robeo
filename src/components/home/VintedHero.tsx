'use client';

import Link from 'next/link';
import type { Product } from '@/types';

interface VintedHeroProps {
  products: Product[];
}

function buildHeroImages(products: Product[]) {
  const imageProducts = products.filter((product) => Boolean(product.image_url)).slice(0, 14);
  if (imageProducts.length > 0) {
    return imageProducts.map((product) => ({
      id: product.id,
      name: product.name,
      image_url: product.image_url as string,
    }));
  }

  return Array.from({ length: 10 }).map((_, idx) => ({
    id: `placeholder-${idx}`,
    name: 'ROBEO termék',
    image_url: `https://picsum.photos/seed/robeo-${idx}/300/420`,
  }));
}

export default function VintedHero({ products }: VintedHeroProps) {
  const heroImages = buildHeroImages(products);
  const firstRow = [...heroImages, ...heroImages];
  const secondRow = [...heroImages.slice().reverse(), ...heroImages.slice().reverse()];

  return (
    <section className="mb-6 md:mb-8">
      <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white">
        <div className="bg-white px-2 py-3 md:px-3 md:py-4 space-y-2">
          <div className="hero-marquee">
            <div className="hero-track hero-track-left">
              {firstRow.map((item, idx) => (
                <div key={`${item.id}-a-${idx}`} className="hero-image-card">
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
          <div className="hero-marquee">
            <div className="hero-track hero-track-right">
              {secondRow.map((item, idx) => (
                <div key={`${item.id}-b-${idx}`} className="hero-image-card">
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#1f2123] px-4 py-8 md:px-8 md:py-10 text-center">
          <h1 className="text-white text-2xl md:text-4xl font-semibold leading-tight tracking-tight max-w-4xl mx-auto">
            Csatlakozz, és add el egykor kedvelt cuccaidat díjmentesen
          </h1>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth"
              className="w-full sm:w-auto min-w-[280px] px-6 py-3 rounded-full bg-[#007782] text-white font-semibold text-sm md:text-base hover:bg-[#00616b] transition-colors"
            >
              Regisztrálás a ROBEO rendszerébe
            </Link>
            <Link
              href="/auth"
              className="w-full sm:w-auto min-w-[280px] px-6 py-3 rounded-full border border-gray-400 text-white font-semibold text-sm md:text-base bg-[#2a2d2f] hover:bg-[#323537] transition-colors"
            >
              Már rendelkezem fiókkal
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
