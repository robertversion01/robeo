'use client';

import { useProducts } from '@/hooks/useProducts';
import Navbar from '@/components/layout/Navbar';
import Filters from '@/components/product/Filters';
import ProductGrid from '@/components/product/ProductGrid';

export default function Home() {
  const {
    products,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    favorites,
    toggleFavorite
  } = useProducts();

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="pt-24 pb-12 px-3 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-5xl font-black tracking-widest mb-2">
              ROBEO
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              A te stílusod, a te közösséged.
            </p>
          </div>

          <Filters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          <p className="text-muted-foreground mb-6">
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