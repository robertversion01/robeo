'use client';

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

  return (
    <div className={`bg-white text-gray-900 overflow-x-hidden max-w-[100vw] ${isGuest ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <main className={`w-full max-w-[100vw] overflow-x-hidden ${isGuest ? 'pt-11 h-screen overflow-hidden p-0' : 'pt-10 pb-6 px-3 md:px-6'}`}>
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