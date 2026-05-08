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
    <div className="bg-white text-gray-900 overflow-x-hidden max-w-[100vw] min-h-screen">
      {isGuest ? (
        <main
          className="fixed inset-0 z-50 w-full h-screen overflow-hidden bg-[#0f1a1d] m-0 p-0"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <VintedHero products={allProducts} fullScreen />
        </main>
      ) : (
        <main className="w-full max-w-[100vw] overflow-x-hidden pt-16 pb-6 px-3 md:px-6">
          <div className="max-w-7xl mx-auto">
            <VintedHero products={allProducts} />

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
              transitionKey={selectedCategory}
            />
          </div>
        </main>
      )}
    </div>
  );
}