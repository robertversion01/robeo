'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '@/hooks/useProducts';
import { useCatalogUrlSync } from '@/hooks/useCatalogUrlSync';
import Filters from '@/components/product/Filters';
import ProductGrid from '@/components/product/ProductGrid';
import CatalogSearchBar from '@/components/browse/CatalogSearchBar';
import CategoryQuickChips from '@/components/browse/CategoryQuickChips';
import SavedSearchesStrip from '@/components/browse/SavedSearchesStrip';
import FeedPersonalizationBanner from '@/components/browse/FeedPersonalizationBanner';
import BrowseDiscoveryRails from '@/components/browse/BrowseDiscoveryRails';
import ActiveFilterBar from '@/components/browse/ActiveFilterBar';
import CatalogFilterSidebar from '@/components/browse/CatalogFilterSidebar';
import { cn } from '@/lib/utils';
import { filterProductsWithValidImages } from '@/lib/productImageValidation';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { supabase } from '@/lib/supabase';
import { DEFAULT_FEED_PREFS, loadUserPreferences } from '@/lib/userPreferences';
import { rankFeedProducts } from '@/lib/feedRanking';
import { useImmersiveBrowse } from '@/context/ImmersiveBrowseContext';
import { listSavedSearchesLocal, loadSavedSearchesMerged } from '@/lib/savedSearches';
import { scanSavedSearchNewMatches } from '@/lib/savedSearchMatcher';
import { runSavedSearchAlertScan } from '@/lib/savedSearchNotify';
import { useMarketplaceBackgroundWorkers } from '@/hooks/useMarketplaceBackgroundWorkers';
import { computeDiscoveryChips } from '@/lib/discoveryStats';
import { fetchGlobalDiscoveryChips } from '@/lib/globalDiscovery';
import ImmersiveFilterSheet from '@/components/browse/ImmersiveFilterSheet';

function sortLabelKey(id: string) {
  if (id === 'price_asc') return 'browse.sort.priceAsc';
  if (id === 'price_desc') return 'browse.sort.priceDesc';
  return 'browse.sort.newest';
}

/** feed = főoldal (Vinted feed); search = Keresés tab teljes szűrővel */
export type CatalogBrowseVariant = 'feed' | 'search';

export type CatalogBrowsePanelProps = {
  browsePath?: string;
  stickyTopClass?: string;
  showPersonalization?: boolean;
  className?: string;
  variant?: CatalogBrowseVariant;
};

function CatalogUrlSyncBridge(props: {
  browsePath: string;
  filters: CatalogFilterState;
  maxPriceLimit: number;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (id: string) => void;
  setSelectedSubcategory: (id: string) => void;
  setSelectedBrand: (id: string) => void;
  setSelectedSize: (id: string) => void;
  setSelectedCondition: (id: string) => void;
  setSelectedColor: (id: string) => void;
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
  variant = 'search',
}: CatalogBrowsePanelProps) {
  const isFeed = variant === 'feed';
  const isSearch = variant === 'search';
  const [feedPrefs, setFeedPrefs] = useState(DEFAULT_FEED_PREFS);
  const [globalDiscovery, setGlobalDiscovery] = useState<{
    topBrands: { name: string; count: number }[];
    topSizes: { name: string; count: number }[];
  } | null>(null);
  const { catalogChromeHidden } = useImmersiveBrowse();
  const { t } = useTranslation();

  const chromeCollapse = cn(
    'transition-[max-height,opacity,margin] duration-300 ease-out overflow-hidden',
    catalogChromeHidden
      ? 'max-h-0 opacity-0 !mb-0 pointer-events-none'
      : 'max-h-[2400px] opacity-100',
  );
  const {
    products,
    loading,
    loadingMore,
    totalCount,
    hasMore,
    loadMore,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    selectedColor,
    setSelectedColor,
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
    removeFilter,
    filterKey,
  } = useProducts();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadUserPreferences(supabase).then((p) => {
      if (!cancelled) setFeedPrefs(p.feed);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useMarketplaceBackgroundWorkers({
    products,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (products.length === 0 || !user) return;
    const saved = listSavedSearchesLocal();
    if (saved.length === 0) return;
    scanSavedSearchNewMatches(saved, products);
    if (isSearch) {
      void loadSavedSearchesMerged(supabase).then((merged) => {
        void runSavedSearchAlertScan(supabase, user.id, merged, products);
      });
    }
  }, [isSearch, products, filterKey, user]);

  const catalogProducts = useMemo(() => {
    const base = filterProductsWithValidImages(products);
    if (isFeed && user) return rankFeedProducts(base, feedPrefs);
    return base;
  }, [products, isFeed, user, feedPrefs]);

  useEffect(() => {
    if (!isSearch) return;
    void fetchGlobalDiscoveryChips(supabase).then(setGlobalDiscovery);
  }, [isSearch]);

  const discoveryChips = useMemo(() => {
    if (isSearch && globalDiscovery) return globalDiscovery;
    return computeDiscoveryChips(catalogProducts);
  }, [isSearch, globalDiscovery, catalogProducts]);

  const catalogFilters: CatalogFilterState = useMemo(
    () => ({
      category: selectedCategory,
      subcategory: selectedSubcategory,
      brand: selectedBrand,
      size: selectedSize,
      condition: selectedCondition,
      color: selectedColor,
      minPrice: selectedMinPrice,
      maxPrice: selectedMaxPrice,
      sort: selectedSort,
      search: searchQuery,
    }),
    [
      selectedCategory,
      selectedSubcategory,
      selectedBrand,
      selectedSize,
      selectedCondition,
      selectedColor,
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

  const filtersProps = {
    categories,
    selectedCategory,
    onCategoryChange: setSelectedCategory,
    selectedSubcategory,
    onSubcategoryChange: setSelectedSubcategory,
    selectedBrand,
    onBrandChange: setSelectedBrand,
    selectedSize,
    onSizeChange: setSelectedSize,
    selectedCondition,
    onConditionChange: setSelectedCondition,
    selectedColor,
    onColorChange: setSelectedColor,
    selectedMinPrice,
    selectedMaxPrice,
    maxPriceLimit,
    onMinPriceChange: setSelectedMinPrice,
    onMaxPriceChange: setSelectedMaxPrice,
    sortOptions: localizedSortOptions,
    selectedSort,
    onSortChange: setSelectedSort,
    activeFilterCount,
    onClearAll: clearAllFilters,
  };

  const discoveryProps = {
    browsePath,
    brandChips: discoveryChips.topBrands,
    sizeChips: discoveryChips.topSizes,
    activeFilters: catalogFilters,
    maxPriceLimit,
    allowFallback: false,
    onBrandPick: setSelectedBrand,
    onSizePick: setSelectedSize,
    onConditionPick: setSelectedCondition,
    onSortPick: setSelectedSort,
    onMaxPricePick: setSelectedMaxPrice,
  };

  const hasActiveFilters =
    activeFilterCount > 0 || searchQuery.trim().length > 0 || selectedSort !== 'newest';

  const applySavedSearch = (saved: typeof catalogFilters) => {
    setSearchQuery(saved.search || '');
    setSelectedCategory(saved.category || 'all');
    setSelectedSubcategory(saved.subcategory || 'all');
    setSelectedBrand(saved.brand || 'all');
    setSelectedSize(saved.size || 'all');
    setSelectedCondition(saved.condition || 'all');
    setSelectedColor(saved.color || 'all');
    setSelectedMinPrice(saved.minPrice || 0);
    if (saved.maxPrice && saved.maxPrice > 0) setSelectedMaxPrice(saved.maxPrice);
    else setSelectedMaxPrice(maxPriceLimit);
    setSelectedSort(saved.sort || 'newest');
  };

  const activeFilterBarProps = {
    filters: catalogFilters,
    maxPriceLimit,
    categories: categories.map((c) => ({
      id: c.id,
      label: t(`browse.categories.${c.id}`, { defaultValue: c.label }),
    })),
    sortOptions: localizedSortOptions,
    onRemove: removeFilter,
    onClearAll: clearAllFilters,
  };

  const resultsLine = (
    <p
      className={cn(
        'mb-2 text-sm tabular-nums text-gray-500',
      )}
    >
      {loading
        ? t('landing.catalog.loading')
        : totalCount > catalogProducts.length
          ? t('landing.catalog.resultsPaged', {
              shown: catalogProducts.length,
              total: totalCount,
            })
          : t('landing.catalog.results', { count: catalogProducts.length })}
    </p>
  );

  const productGridBlock = (
    <>
      {resultsLine}
      <ProductGrid
        products={catalogProducts}
        loading={loading}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        transitionKey={filterKey}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
      />
      {!loading && hasMore ? (
        <div className="mt-6 flex justify-center pb-8">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="min-h-11 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
          >
            {loadingMore ? t('landing.catalog.loadingMore') : t('landing.catalog.loadMore')}
          </button>
        </div>
      ) : null}
    </>
  );

  return (
    <div id="catalog" className={cn('scroll-mt-14', className)}>
      <CatalogUrlSyncBridge
        browsePath={browsePath}
        filters={catalogFilters}
        maxPriceLimit={maxPriceLimit}
        setSearchQuery={setSearchQuery}
        setSelectedCategory={setSelectedCategory}
        setSelectedSubcategory={setSelectedSubcategory}
        setSelectedBrand={setSelectedBrand}
        setSelectedSize={setSelectedSize}
        setSelectedCondition={setSelectedCondition}
        setSelectedColor={setSelectedColor}
        setSelectedMinPrice={setSelectedMinPrice}
        setSelectedMaxPrice={setSelectedMaxPrice}
        setSelectedSort={setSelectedSort}
      />

      {showPersonalization && user && isSearch && selectedCategory !== 'all' ? (
        <FeedPersonalizationBanner
          mode="search"
          products={catalogProducts}
          favoriteIds={favorites}
          preferredCategory={t(`browse.departments.${selectedCategory}`, {
            defaultValue: t(`browse.categories.${selectedCategory}`, { defaultValue: selectedCategory }),
          })}
        />
      ) : null}

      {isFeed ? (
        <div className={chromeCollapse}>
          {showPersonalization && user ? (
            <FeedPersonalizationBanner
              mode="feed"
              products={catalogProducts}
              favoriteIds={favorites}
              preferredCategory={
                selectedCategory !== 'all'
                  ? t(`browse.departments.${selectedCategory}`, { defaultValue: selectedCategory })
                  : undefined
              }
            />
          ) : null}
          <div className="mb-3 space-y-3 px-0 md:-mx-0 md:px-0">
            <BrowseDiscoveryRails
              {...discoveryProps}
              prefBrands={feedPrefs.brands}
              compact
            />
            <CategoryQuickChips
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'sticky z-40 mb-2 border-b border-gray-200/90 bg-white/95 px-0 pt-3 pb-1 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:px-0 shadow-sm lg:static lg:border-0 lg:bg-transparent lg:shadow-none lg:backdrop-blur-none',
            stickyTopClass,
          )}
        >
          <div className="space-y-3 pb-2 lg:hidden">
            <BrowseDiscoveryRails {...discoveryProps} compact />
            <CatalogSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              catalogFilters={catalogFilters}
              maxPriceLimit={maxPriceLimit}
              browsePath={browsePath}
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
          <div className="lg:hidden">
            <Filters {...filtersProps} />
            <ActiveFilterBar {...activeFilterBarProps} className="pb-2" />
          </div>
        </div>
      )}

      {isSearch ? (
        <div className="lg:grid lg:grid-cols-[272px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <aside className="hidden lg:block">
            <CatalogFilterSidebar
              {...filtersProps}
              catalogFilters={catalogFilters}
              className="sticky top-[5.25rem] z-30"
            />
          </aside>

          <div className="min-w-0">
            <div className="mb-4 hidden space-y-3 lg:block">
              <CatalogSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                catalogFilters={catalogFilters}
                maxPriceLimit={maxPriceLimit}
                browsePath={browsePath}
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
              <BrowseDiscoveryRails {...discoveryProps} hacooCard />
              <ActiveFilterBar {...activeFilterBarProps} />
            </div>
            {productGridBlock}
          </div>
        </div>
      ) : (
        productGridBlock
      )}

      <ImmersiveFilterSheet
        catalogFilters={catalogFilters}
        activeFilterCount={activeFilterCount}
        onApply={() => {
          if (typeof document !== 'undefined') {
            document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
        filtersProps={filtersProps}
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
