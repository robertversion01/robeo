'use client';

import { Search } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
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
    <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-indigo-950 dark:to-black text-gray-900 dark:text-white">
      <main className="pt-16 pb-12 px-3 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" size={16} />
            <input 
              type="text" 
              placeholder="Keresés..." 
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 dark:bg-white/10 rounded-full text-sm border border-transparent dark:border-white/10 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <Filters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          <p className="text-gray-500 dark:text-muted-foreground text-sm mb-4">
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