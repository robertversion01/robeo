'use client';

import { Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '@/hooks/useProducts';
import { useCatalogUrlSync } from '@/hooks/useCatalogUrlSync';
import Filters from '@/components/product/Filters';
import ProductGrid from '@/components/product/ProductGrid';
import CatalogSearchBar from '@/components/browse/CatalogSearchBar';
import CategoryQuickChips from '@/components/browse/CategoryQuickChips';
import SavedSearchesStrip from '@/components/browse/SavedSearchesStrip';
import FeedPersonalizationBanner from '@/components/browse/FeedPersonalizationBanner';
import { cn } from '@/lib/utils';
import { filterProductsWithValidImages } from '@/lib/productImageValidation';
import type { CatalogFilterState } from '@/lib/catalogFilters';

function sortLabelKey(id: string) {
  if (id === 'price_asc') return 'browse.sort.priceAsc';
  if (id === 'price_desc') return 'browse.sort.priceDesc';
  return 'browse.sort.newest';
}

export type CatalogBrowsePanelProps = {
  browsePath?: string;
  stickyTopClass?: string;
  showPersonalization?: boolean;
  className?: string;
};

function CatalogUrlSyncBridge(props: {
  browsePath: string;
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

function CatalogBrowsePanelInner({
  browsePath = '/browse',
  stickyTopClass = 'top-11',
  showPersonalization = true,
  className,
}: CatalogBrowsePanelProps) {
  const { t } = useTranslation();
  const {
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

  return (
    <div id="catalog" className={cn('scroll-mt-14', className)}>
      <CatalogUrlSyncBridge
        browsePath={browsePath}
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

      {showPersonalization && user ? (
        <FeedPersonalizationBanner
          products={catalogProducts}
          favoriteIds={favorites}
          preferredCategory={
            selectedCategory !== 'all' ? t(`browse.categories.${selectedCategory}`) : undefined
          }
        />
      ) : null}

      <div
        className={cn(
          'sticky z-40 -mx-2 mb-1.5 border-b border-gray-200/90 bg-white/95 px-2 pt-2 pb-0 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:-mx-0 md:px-0 shadow-sm',
          stickyTopClass,
        )}
      >
        <div className="space-y-2.5 pb-2">
          <div className={user ? 'md:hidden' : ''}>
            <CatalogSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              catalogFilters={catalogFilters}
              maxPriceLimit={maxPriceLimit}
              browsePath={browsePath}
            />
          </div>
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
    </div>
  );
}

export default function CatalogBrowsePanel(props: CatalogBrowsePanelProps) {
  return (
    <Suspense fallback={null}>
      <CatalogBrowsePanelInner {...props} />
    </Suspense>
  );
}
