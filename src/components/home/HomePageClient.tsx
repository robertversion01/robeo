'use client';

import { Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '@/hooks/useProducts';
import { useCatalogUrlSync } from '@/hooks/useCatalogUrlSync';
import Filters from '@/components/product/Filters';
import ProductGrid from '@/components/product/ProductGrid';
import VintedHero from '@/components/home/VintedHero';
import CatalogSearchBar from '@/components/browse/CatalogSearchBar';
import CategoryQuickChips from '@/components/browse/CategoryQuickChips';
import SavedSearchesStrip from '@/components/browse/SavedSearchesStrip';
import FeedPersonalizationBanner from '@/components/browse/FeedPersonalizationBanner';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';
import { cn } from '@/lib/utils';
import { filterProductsWithValidImages } from '@/lib/productImageValidation';
import type { CatalogFilterState } from '@/lib/catalogFilters';

function sortLabelKey(id: string) {
  if (id === 'price_asc') return 'browse.sort.priceAsc';
  if (id === 'price_desc') return 'browse.sort.priceDesc';
  return 'browse.sort.newest';
}

function HomeCatalogUrlSync(props: {
  filters: CatalogFilterState;
  maxPriceLimit: number;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (id: string) => void;
  setSelectedBrand: (id: string) => void;
  setSelectedSize: (id: string) => void;
  setSelectedCondition: (id: string) => void;
  setSelectedMinPrice: (n: number) => void;
  setSelectedMaxPrice: (n: number) => void;
  setSelectedSort: (id: string) => void;
}) {
  useCatalogUrlSync(props);
  return null;
}

function HomePageContent() {
  const { t } = useTranslation();
  const {
    allProducts,
    products,
    loading,
    searchQuery,
    setSearchQuery,
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

  const catalogFilters: CatalogFilterState = useMemo(
    () => ({
      category: selectedCategory,
      brand: selectedBrand,
      size: selectedSize,
      condition: selectedCondition,
      minPrice: selectedMinPrice,
      maxPrice: selectedMaxPrice,
      sort: selectedSort,
      search: searchQuery,
    }),
    [
      selectedCategory,
      selectedBrand,
      selectedSize,
      selectedCondition,
      selectedMinPrice,
      selectedMaxPrice,
      selectedSort,
      searchQuery,
    ],
  );

  const localizedSortOptions = useMemo(
    () => sortOptions.map((opt) => ({ id: opt.id, label: t(sortLabelKey(opt.id)) })),
    [sortOptions, t],
  );

  const hasActiveFilters =
    activeFilterCount > 0 || searchQuery.trim().length > 0 || selectedSort !== 'newest';

  const applySavedSearch = (saved: typeof catalogFilters) => {
    setSearchQuery(saved.search || '');
    setSelectedCategory(saved.category || 'all');
    setSelectedBrand(saved.brand || 'all');
    setSelectedSize(saved.size || 'all');
    setSelectedCondition(saved.condition || 'all');
    setSelectedMinPrice(saved.minPrice || 0);
    if (saved.maxPrice && saved.maxPrice > 0) setSelectedMaxPrice(saved.maxPrice);
    else setSelectedMaxPrice(maxPriceLimit);
    setSelectedSort(saved.sort || 'newest');
  };

  const scrollToCatalog = () => {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filterBar = (
    <div
      className={cn(
        'sticky z-40 -mx-2 mb-1.5 border-b border-gray-200/90 bg-white/95 px-2 pt-2 pb-0 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:-mx-6 md:px-6 shadow-sm',
        isGuest ? 'top-0' : 'top-11',
      )}
    >
      <div className="space-y-2.5 pb-2">
        <CatalogSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          catalogFilters={catalogFilters}
          maxPriceLimit={maxPriceLimit}
          onSeeAll={scrollToCatalog}
        />
        <CategoryQuickChips
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        <SavedSearchesStrip
          filters={catalogFilters}
          hasActiveFilters={hasActiveFilters}
          onApply={applySavedSearch}
        />
      </div>
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
        sortOptions={localizedSortOptions}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
        activeFilterCount={activeFilterCount}
        onClearAll={clearAllFilters}
      />
    </div>
  );

  const catalog = (
    <>
      {!isGuest ? (
        <FeedPersonalizationBanner
          products={catalogProducts}
          favoriteIds={favorites}
          preferredCategory={
            selectedCategory !== 'all' ? t(`browse.categories.${selectedCategory}`) : undefined
          }
        />
      ) : null}
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
      <HomeCatalogUrlSync
        filters={catalogFilters}
        maxPriceLimit={maxPriceLimit}
        setSearchQuery={setSearchQuery}
        setSelectedCategory={setSelectedCategory}
        setSelectedBrand={setSelectedBrand}
        setSelectedSize={setSelectedSize}
        setSelectedCondition={setSelectedCondition}
        setSelectedMinPrice={setSelectedMinPrice}
        setSelectedMaxPrice={setSelectedMaxPrice}
        setSelectedSort={setSelectedSort}
      />
      {isGuest ? (
        <main className="w-full max-w-[100vw] overflow-x-hidden">
          <VintedHero products={filterProductsWithValidImages(allProducts)} fullScreen />
          <div
            id="catalog"
            className="landing-catalog mx-auto max-w-7xl scroll-mt-2 px-2 pb-4 pt-3 md:px-6 md:pt-4"
          >
            <h2 className="mb-2 text-base font-semibold text-gray-900 md:text-lg">
              {t('landing.catalog.title')}
            </h2>
            {catalog}
          </div>
        </main>
      ) : (
        <main
          className={`w-full max-w-[100vw] overflow-x-hidden ${MAIN_TOP_PADDING} px-2 pb-4 md:px-6`}
        >
          <div id="catalog" className="mx-auto max-w-7xl scroll-mt-14">
            <VintedHero products={filterProductsWithValidImages(allProducts)} compact />
            {catalog}
          </div>
        </main>
      )}
    </div>
  );
}

export default function HomePageClient() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
