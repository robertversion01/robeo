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
  variant = 'search',
}: CatalogBrowsePanelProps) {
  const isFeed = variant === 'feed';
  const isSearch = variant === 'search';
  const [feedPrefs, setFeedPrefs] = useState(DEFAULT_FEED_PREFS);
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

  const discoveryChips = useMemo(
    () => computeDiscoveryChips(catalogProducts),
    [catalogProducts],
  );

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

      <div className={chromeCollapse}>
        {showPersonalization && user && isFeed ? (
          <FeedPersonalizationBanner
            mode="feed"
            products={catalogProducts}
            favoriteIds={favorites}
            preferredCategory={
              selectedCategory !== 'all' ? t(`browse.categories.${selectedCategory}`) : undefined
            }
          />
        ) : null}

        {showPersonalization && user && isSearch && selectedCategory !== 'all' ? (
          <FeedPersonalizationBanner
            mode="search"
            products={catalogProducts}
            favoriteIds={favorites}
            preferredCategory={t(`browse.categories.${selectedCategory}`)}
          />
        ) : null}

        {isFeed ? (
          <div className="mb-2 -mx-2 px-2 md:-mx-0 md:px-0 space-y-2">
            <BrowseDiscoveryRails
              browsePath={browsePath}
              brandChips={discoveryChips.topBrands}
              sizeChips={discoveryChips.topSizes}
              prefBrands={feedPrefs.brands}
              allowFallback={false}
              compact
              onBrandPick={(brand) => setSelectedBrand(brand)}
              onSizePick={(size) => setSelectedSize(size)}
              onConditionPick={(condition) => setSelectedCondition(condition)}
              onSortPick={(sort) => setSelectedSort(sort)}
              onMaxPricePick={(max) => setSelectedMaxPrice(max)}
            />
            <CategoryQuickChips
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>
        ) : (
          <div
            className={cn(
              'sticky z-40 -mx-2 mb-1.5 border-b border-gray-200/90 bg-white/95 px-2 pt-2 pb-0 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:-mx-0 md:px-0 shadow-sm',
              stickyTopClass,
              catalogChromeHidden && 'static border-transparent shadow-none',
            )}
          >
          <div className="space-y-2.5 pb-2">
            {isSearch ? (
              <BrowseDiscoveryRails
                browsePath={browsePath}
                brandChips={discoveryChips.topBrands}
                sizeChips={discoveryChips.topSizes}
                allowFallback={false}
                onBrandPick={(brand) => setSelectedBrand(brand)}
                onSizePick={(size) => setSelectedSize(size)}
                onConditionPick={(condition) => setSelectedCondition(condition)}
                onSortPick={(sort) => setSelectedSort(sort)}
                onMaxPricePick={(max) => setSelectedMaxPrice(max)}
              />
            ) : null}
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
          <ActiveFilterBar
            filters={catalogFilters}
            maxPriceLimit={maxPriceLimit}
            categories={categories.map((c) => ({
              id: c.id,
              label: t(`browse.categories.${c.id}`, { defaultValue: c.label }),
            }))}
            sortOptions={localizedSortOptions}
            onRemove={removeFilter}
            onClearAll={clearAllFilters}
            className="pb-2"
          />
        </div>
        )}
      </div>

      <p
        className={cn(
          'mb-2 text-sm tabular-nums text-gray-500 transition-opacity duration-300',
          catalogChromeHidden && 'max-md:opacity-0 max-md:h-0 max-md:mb-0 overflow-hidden',
        )}
      >
        {loading ? t('landing.catalog.loading') : t('landing.catalog.results', { count: catalogProducts.length })}
      </p>
      <ProductGrid
        products={catalogProducts}
        loading={loading}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        transitionKey={filterKey}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
      />

      <ImmersiveFilterSheet
        catalogFilters={catalogFilters}
        activeFilterCount={activeFilterCount}
        onApply={() => {
          if (typeof document !== 'undefined') {
            document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
        filtersProps={{
          categories,
          selectedCategory,
          onCategoryChange: setSelectedCategory,
          selectedBrand,
          onBrandChange: setSelectedBrand,
          selectedSize,
          onSizeChange: setSelectedSize,
          selectedCondition,
          onConditionChange: setSelectedCondition,
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
        }}
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
