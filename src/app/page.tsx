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
      <Navbar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="pt-28 pb-12 px-3 md:px-6">
        <div className="max-w-7xl mx-auto">
          <Filters
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