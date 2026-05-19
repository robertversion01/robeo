'use client';

import { useProducts } from '@/hooks/useProducts';
import Filters from '@/components/product/Filters';
import ProductGrid from '@/components/product/ProductGrid';
import VintedHero from '@/components/home/VintedHero';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

export default function HomePageClient() {
  const {
    allProducts,
    products,
    loading,
    selectedCategory,
    setSelectedCategory,
    selectedMinPrice,
    setSelectedMinPrice,
    selectedMaxPrice,
    setSelectedMaxPrice,
    maxPriceLimit,
    categories,
    favorites,
    toggleFavorite,
    user,
    selectedSort,
    setSelectedSort,
    sortOptions,
    selectedBrand,
    setSelectedBrand,
    selectedSize,
    setSelectedSize,
    selectedCondition,
    setSelectedCondition,
    activeFilterCount,
    clearAllFilters,
  } = useProducts();
  const isGuest = !user;

  const filterBar = (
    <div className="sticky z-30 -mx-2 md:-mx-6 mb-1.5 border-b border-gray-200/90 bg-white/95 px-2 pt-1.5 pb-0 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:px-6 shadow-sm top-[6.75rem] sm:top-11">
      <Filters
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedBrand={selectedBrand}
        onBrandChange={setSelectedBrand}
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
        selectedCondition={selectedCondition}
        onConditionChange={setSelectedCondition}
        selectedMinPrice={selectedMinPrice}
        selectedMaxPrice={selectedMaxPrice}
        maxPriceLimit={maxPriceLimit}
        onMinPriceChange={setSelectedMinPrice}
        onMaxPriceChange={setSelectedMaxPrice}
        sortOptions={sortOptions}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
        activeFilterCount={activeFilterCount}
        onClearAll={clearAllFilters}
      />
    </div>
  );

  const catalog = (
    <>
      {filterBar}
      <p className="text-gray-500 text-sm mb-2 tabular-nums">
        {loading ? 'Betöltés...' : `${products.length} találat`}
      </p>
      <ProductGrid
        products={products}
        loading={loading}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        transitionKey={`${selectedCategory}-${selectedBrand}-${selectedSize}-${selectedCondition}-${selectedMinPrice}-${selectedMaxPrice}-${selectedSort}`}
      />
    </>
  );

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden max-w-[100vw] min-h-screen">
      {isGuest ? (
        <main className="w-full max-w-[100vw] overflow-x-hidden pt-14 min-h-screen">
          <VintedHero products={allProducts} fullScreen />
          <div className={`max-w-7xl mx-auto px-2 md:px-6 pb-4 ${MAIN_TOP_PADDING}`}>
            {catalog}
          </div>
        </main>
      ) : (
        <main
          className={`w-full max-w-[100vw] overflow-x-hidden ${MAIN_TOP_PADDING} pb-4 px-2 md:px-6`}
        >
          <div className="max-w-7xl mx-auto">
            <VintedHero products={allProducts} compact />
            {catalog}
          </div>
        </main>
      )}
    </div>
  );
}
