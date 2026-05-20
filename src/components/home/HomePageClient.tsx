'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '@/hooks/useProducts';
import Filters from '@/components/product/Filters';
import ProductGrid from '@/components/product/ProductGrid';
import VintedHero from '@/components/home/VintedHero';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';
import { cn } from '@/lib/utils';
import { filterProductsWithValidImages } from '@/lib/productImageValidation';

export default function HomePageClient() {
  const { t } = useTranslation();
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
    filterKey,
  } = useProducts();
  const isGuest = !user;
  const catalogProducts = useMemo(() => filterProductsWithValidImages(products), [products]);

  const filterBar = (
    <div
      className={cn(
        'sticky z-40 -mx-2 mb-1.5 border-b border-gray-200/90 bg-white/95 px-2 pt-1.5 pb-0 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:-mx-6 md:px-6 shadow-sm',
        isGuest ? 'top-0' : 'top-11',
      )}
    >
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
      <p className="mb-2 text-sm tabular-nums text-gray-500">
        {loading ? t('landing.catalog.loading') : t('landing.catalog.results', { count: catalogProducts.length })}
      </p>
      <ProductGrid
        products={products}
        loading={loading}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        transitionKey={filterKey}
      />
    </>
  );

  return (
    <div className="landing-page-root min-h-screen max-w-[100vw] overflow-x-hidden bg-white text-gray-900">
      {isGuest ? (
        <main className="w-full max-w-[100vw] overflow-x-hidden">
          <VintedHero products={filterProductsWithValidImages(allProducts)} fullScreen />
          <div className="landing-catalog mx-auto max-w-7xl px-2 pb-4 pt-2 md:px-6 md:pt-3">
            {catalog}
          </div>
        </main>
      ) : (
        <main
          className={`w-full max-w-[100vw] overflow-x-hidden ${MAIN_TOP_PADDING} px-2 pb-4 md:px-6`}
        >
          <div className="mx-auto max-w-7xl">
            <VintedHero products={filterProductsWithValidImages(allProducts)} compact />
            {catalog}
          </div>
        </main>
      )}
    </div>
  );
}
