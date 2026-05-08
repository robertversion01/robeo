'use client';

import { useEffect } from 'react';
import { useProducts } from '@/hooks/useProducts';
import Filters from '@/components/product/Filters';
import ProductGrid from '@/components/product/ProductGrid';
import VintedHero from '@/components/home/VintedHero';

export default function Home() {
  const {
    allProducts,
    products,
    loading,
    selectedCategory,
    setSelectedCategory,
    categories,
    favorites,
    toggleFavorite,
    user
  } = useProducts();
  const isGuest = !user;

  useEffect(() => {
    if (!isGuest) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyHeight = document.body.style.height;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlHeight = document.documentElement.style.height;

    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100vh';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.height = previousBodyHeight;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.height = previousHtmlHeight;
    };
  }, [isGuest]);

  return (
    <div className={`bg-white text-gray-900 overflow-x-hidden max-w-[100vw] ${isGuest ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <main className={`w-full max-w-[100vw] overflow-x-hidden ${isGuest ? 'h-screen overflow-hidden p-0' : 'pt-10 pb-6 px-3 md:px-6'}`}>
        <div className={`${isGuest ? 'w-full h-full' : 'max-w-7xl mx-auto'}`}>
          <VintedHero products={allProducts} fullScreen={isGuest} />

          {!isGuest ? (
            <>
              <Filters
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />

              <p className="text-gray-500 text-sm mb-1.5">
                {loading ? 'Betöltés...' : `${products.length} találat`}
              </p>

              <ProductGrid
                products={products}
                loading={loading}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}