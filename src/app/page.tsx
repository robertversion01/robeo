'use client';

import { Search } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import Filters from '@/components/product/Filters';
import ProductGrid from '@/components/product/ProductGrid';
import FreshOffersStrip from '@/components/home/FreshOffersStrip';
import VintedHero from '@/components/home/VintedHero';

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
    toggleFavorite,
    user
  } = useProducts();

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    '';

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="pt-14 pb-10 px-3 md:px-6">
        <div className="max-w-7xl mx-auto">
          {!user ? <VintedHero products={products} /> : null}

          {user ? (
            <section className="mb-2">
              <p className="text-sm md:text-base font-semibold text-gray-800">
                Szia {firstName}!
              </p>
            </section>
          ) : null}

          {/* Search Bar */}
          <div className="relative mb-2 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Keresés..." 
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-full text-sm border border-gray-200 focus:outline-none focus:border-[#007782] transition-colors"
            />
          </div>

          <Filters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          <FreshOffersStrip className="mt-2 mb-3" />

          <p className="text-gray-500 text-sm mb-3">
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