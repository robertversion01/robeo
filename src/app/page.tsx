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

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="pt-10 pb-6 px-3 md:px-6">
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
          />
        </div>
      </main>
    </div>
  );
}