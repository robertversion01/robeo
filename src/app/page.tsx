'use client';

import { useProducts } from '@/hooks/useProducts';
import Filters from '@/components/product/Filters';
import ProductGrid from '@/components/product/ProductGrid';
import FreshOffersStrip from '@/components/home/FreshOffersStrip';
import VintedHero from '@/components/home/VintedHero';

export default function Home() {
  const {
    allProducts,
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
      <main className="pt-11 pb-8 px-3 md:px-6">
        <div className="max-w-7xl mx-auto">
          {!user ? <VintedHero products={allProducts} /> : null}

          {user ? (
            <section className="mb-2.5">
              <p className="text-sm font-semibold text-gray-800">
                Szia {firstName}!
              </p>
            </section>
          ) : null}

          <Filters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <FreshOffersStrip className="mt-1 mb-2.5" />

          <p className="text-gray-500 text-sm mb-2.5">
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