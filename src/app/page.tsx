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

      <main className="pt-36 pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-black tracking-widest mb-4">
              ROBEO
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-xl mx-auto">
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