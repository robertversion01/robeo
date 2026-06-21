'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '@/hooks/useProducts';
import { useCatalogUrlSync } from '@/hooks/useCatalogUrlSync';
import Filters from '@/components/product/Filters';
import ProductGrid from '@/components/product/ProductGrid';
import CatalogSearchBar from '@/components/browse/CatalogSearchBar';
import CategoryQuickChips from '@/components/browse/CategoryQuickChips';
import ListingTypeToggle from '@/components/browse/ListingTypeToggle';
import SavedSearchesStrip from '@/components/browse/SavedSearchesStrip';
import FeedPersonalizationBanner from '@/components/browse/FeedPersonalizationBanner';
import BrowseDiscoveryRails from '@/components/browse/BrowseDiscoveryRails';
import ActiveFilterBar from '@/components/browse/ActiveFilterBar';
import CatalogFilterSidebar from '@/components/browse/CatalogFilterSidebar';
import { cn } from '@/lib/utils';
import { filterProductsWithValidImages } from '@/lib/productImageValidation';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import type { SavedSearch } from '@/lib/savedSearches';
import { supabase } from '@/lib/supabase';
import { DEFAULT_FEED_PREFS, loadUserPreferences } from '@/lib/userPreferences';
import { rankFeedProducts } from '@/lib/feedRanking';
import { dedupeProductsById } from '@/lib/dedupeProducts';
import { useImmersiveBrowse } from '@/context/ImmersiveBrowseContext';
import { listSavedSearchesLocal, loadSavedSearchesMerged } from '@/lib/savedSearches';
import { scanSavedSearchNewMatches } from '@/lib/savedSearchMatcher';
import { runSavedSearchAlertScan } from '@/lib/savedSearchNotify';
import { useMarketplaceBackgroundWorkers } from '@/hooks/useMarketplaceBackgroundWorkers';
import { computeDiscoveryChips } from '@/lib/discoveryStats';
import { fetchGlobalDiscoveryChips } from '@/lib/globalDiscovery';
import ImmersiveFilterSheet from '@/components/browse/ImmersiveFilterSheet';
import MobileFeedChrome from '@/components/layout/MobileFeedChrome';
import FeedCategorySwipeSurface from '@/components/browse/FeedCategorySwipeSurface';
import FollowedSellersStrip from '@/components/home/FollowedSellersStrip';
import DistrictDiscoveryRail from '@/components/browse/DistrictDiscoveryRail';
import HomeDistrictPicker from '@/components/browse/HomeDistrictPicker';
import { departmentLabel } from '@/lib/categoryDisplay';
import { ROBEO_BP_MODE } from '@/lib/features';
import { FEED_VIEWPORT_PRIORITY_COUNT } from '@/lib/imagePresets';
import { getDistrictLabel } from '@/lib/budapestDistricts';
import { useCatalogFilterCounts } from '@/hooks/useCatalogFilterCounts';

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
  setSelectedListingType: (type: 'all' | 'product' | 'service') => void;
  setSelectedBudapestDistrict: (id: string) => void;
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
  const { catalogChromeHidden, openFilterSheet } = useImmersiveBrowse();
  const { t } = useTranslation();

  const chromeCollapse = cn(
    'transition-[max-height,opacity,margin] duration-300 ease-out',
    catalogChromeHidden
      ? 'max-h-0 opacity-0 !mb-0 pointer-events-none overflow-hidden'
      : 'max-h-[2400px] opacity-100',
  );
  const {
    products,
    loading,
    refreshing,
    loadingMore,
    totalCount,
    hasMore,
    loadMore,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedListingType,
    setSelectedListingType,
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
    selectedBudapestDistrict,
    setSelectedBudapestDistrict,
    activeFilterCount,
    clearAllFilters,
    applyCatalogFilters,
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
    if (!isSearch) return;
    const timer = window.setTimeout(() => {
      void loadSavedSearchesMerged(supabase).then((merged) => {
        void runSavedSearchAlertScan(supabase, user.id, merged, products);
      });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [isSearch, products, filterKey, user]);

  const catalogProducts = useMemo(() => {
    const base = dedupeProductsById(filterProductsWithValidImages(products));
    const ranked = isFeed && user ? rankFeedProducts(base, feedPrefs) : base;
    return dedupeProductsById(ranked);
  }, [products, isFeed, user, feedPrefs]);

  const handleCategoryChange = useCallback(
    (id: string, opts?: { scroll?: boolean }) => {
      setSelectedCategory(id);
      if (isFeed && opts?.scroll !== false && typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    },
    [isFeed, setSelectedCategory],
  );

  const handleFeedSwipeCategoryChange = useCallback(
    (id: string) => handleCategoryChange(id, { scroll: false }),
    [handleCategoryChange],
  );

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
      listingType: selectedListingType,
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
      budapest_district: selectedBudapestDistrict,
    }),
    [
      selectedListingType,
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
      selectedBudapestDistrict,
    ],
  );

  const localizedSortOptions = useMemo(
    () => sortOptions.map((opt) => ({ id: opt.id, label: t(sortLabelKey(opt.id)) })),
    [sortOptions, t],
  );

  const filtersMeta = useMemo(
    () => ({
      categories: categories.map((c) => ({
        id: c.id,
        label: departmentLabel(t, c.id, c.label),
      })),
      sortOptions: localizedSortOptions,
      maxPriceLimit,
    }),
    [categories, localizedSortOptions, maxPriceLimit, t],
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
    listingType: selectedListingType,
    selectedBudapestDistrict,
    onBudapestDistrictChange: setSelectedBudapestDistrict,
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

  const categoryIds = useMemo(
    () => categories.map((c) => c.id).filter((id) => id !== 'all'),
    [categories],
  );
  const filterCounts = useCatalogFilterCounts(catalogFilters, categoryIds, [], []);

  const applySavedSearch = (saved: SavedSearch['filters']) => {
    setSearchQuery(saved.search || '');
    setSelectedListingType(saved.listingType || 'all');
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
    setSelectedBudapestDistrict(saved.budapest_district || 'all');
  };

  const activeFilterBarProps = {
    filters: catalogFilters,
    maxPriceLimit,
    categories: categories.map((c) => ({
      id: c.id,
      label: departmentLabel(t, c.id, c.label),
    })),
    sortOptions: localizedSortOptions,
    onRemove: removeFilter,
    onClearAll: clearAllFilters,
  };

  const resultsLine = (
    <p
      className={cn(
        'mb-1 text-sm tabular-nums text-[#9aadb5]',
        isFeed && 'hidden md:block',
      )}
    >
      {loading && catalogProducts.length === 0
        ? t('landing.catalog.loading')
        : refreshing
          ? t('landing.catalog.refreshing')
          : totalCount > catalogProducts.length
          ? t('landing.catalog.resultsPaged', {
              shown: catalogProducts.length,
              total: totalCount,
            })
          : t('landing.catalog.results', { count: catalogProducts.length })}
    </p>
  );

  const activeDistrictLabel =
    ROBEO_BP_MODE && selectedBudapestDistrict && selectedBudapestDistrict !== 'all'
      ? getDistrictLabel(selectedBudapestDistrict)
      : undefined;

  const productGridBlock = (
    <>
      {resultsLine}
      <ProductGrid
        products={catalogProducts}
        loading={loading}
        refreshing={refreshing}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        transitionKey={filterKey}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
        listingType={selectedListingType}
        districtLabel={activeDistrictLabel || undefined}
        onClearDistrict={() => removeFilter('budapest_district')}
        cardImagePreset={isFeed ? 'homepageFeed' : 'feedCard'}
        priorityCount={isFeed ? FEED_VIEWPORT_PRIORITY_COUNT : 4}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedBrand={selectedBrand}
        onApplySearch={setSearchQuery}
      />
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
        setSelectedListingType={setSelectedListingType}
        setSelectedBudapestDistrict={setSelectedBudapestDistrict}
      />

      {showPersonalization && user && isSearch && selectedCategory !== 'all' ? (
        <FeedPersonalizationBanner
          mode="search"
          products={catalogProducts}
          favoriteIds={favorites}
          preferredCategory={departmentLabel(t, selectedCategory, selectedCategory)}
        />
      ) : null}

      {isFeed ? (
        <FeedCategorySwipeSurface
          enabled={isFeed}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleFeedSwipeCategoryChange}
        >
          <div className={chromeCollapse}>
            <MobileFeedChrome
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              catalogFilters={catalogFilters}
              maxPriceLimit={maxPriceLimit}
              browsePath={browsePath}
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              categoryCounts={filterCounts.categories}
              className="mb-0.5 lg:hidden"
            />
            {showPersonalization && user ? (
              <div className="mb-3 hidden md:block">
                <FollowedSellersStrip />
                <FeedPersonalizationBanner
                  mode="feed"
                  products={catalogProducts}
                  favoriteIds={favorites}
                  preferredCategory={
                    selectedCategory !== 'all'
                      ? departmentLabel(t, selectedCategory, selectedCategory)
                      : undefined
                  }
                />
              </div>
            ) : null}
            {ROBEO_BP_MODE && user ? (
              <HomeDistrictPicker className="mb-3 hidden md:block" />
            ) : null}
            {ROBEO_BP_MODE ? (
              <DistrictDiscoveryRail
                browsePath={browsePath}
                catalogFilters={catalogFilters}
                maxPriceLimit={maxPriceLimit}
                selectedDistrict={selectedBudapestDistrict}
                onDistrictPick={setSelectedBudapestDistrict}
                className="mb-3 hidden lg:block"
              />
            ) : null}
            <div className="mb-4 hidden space-y-3 lg:block">
              <BrowseDiscoveryRails
                {...discoveryProps}
                prefBrands={feedPrefs.brands}
                compact
              />
              <ListingTypeToggle
                value={selectedListingType}
                onChange={setSelectedListingType}
                className="mb-2"
              />
              <CategoryQuickChips
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                categoryCounts={filterCounts.categories}
              />
            </div>
          </div>
          <div className="mb-2 lg:hidden">
            <ListingTypeToggle
              value={selectedListingType}
              onChange={setSelectedListingType}
              className="mb-2"
            />
            <Filters {...filtersProps} layout="compact" onOpenAllFilters={openFilterSheet} />
          </div>
          <div className="sticky top-[3.25rem] z-20 -mx-1 mb-2 border-b border-[#27363d]/60 bg-[#11171a]/90 px-1 py-1.5 backdrop-blur lg:hidden">
            <ActiveFilterBar {...activeFilterBarProps} />
          </div>
          {productGridBlock}
        </FeedCategorySwipeSurface>
      ) : (
        <>
          <MobileFeedChrome
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            catalogFilters={catalogFilters}
            maxPriceLimit={maxPriceLimit}
            browsePath={browsePath}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            className="mb-0 lg:hidden"
            categoryCounts={filterCounts.categories}
          >
            <SavedSearchesStrip
              filters={catalogFilters}
              hasActiveFilters={hasActiveFilters}
              onApply={applySavedSearch}
            />
          </MobileFeedChrome>
          <div className="mb-2 lg:hidden">
            <ListingTypeToggle
              value={selectedListingType}
              onChange={setSelectedListingType}
              className="mb-2"
            />
            <Filters {...filtersProps} layout="compact" onOpenAllFilters={openFilterSheet} />
          </div>
          <div className="sticky top-[3.25rem] z-20 -mx-1 mb-2 border-b border-[#27363d]/60 bg-[#11171a]/90 px-1 py-1.5 backdrop-blur lg:hidden">
            <ActiveFilterBar {...activeFilterBarProps} />
          </div>
          {user && showPersonalization ? <FollowedSellersStrip className="mb-3 lg:hidden" /> : null}
          {ROBEO_BP_MODE ? (
            <>
              {user ? <HomeDistrictPicker className="mb-3" /> : null}
              <DistrictDiscoveryRail
                browsePath={browsePath}
                catalogFilters={catalogFilters}
                maxPriceLimit={maxPriceLimit}
                selectedDistrict={selectedBudapestDistrict}
                onDistrictPick={setSelectedBudapestDistrict}
                className="mb-3"
                collapsible
              />
            </>
          ) : null}
        </>
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
            <div className="sticky top-[4.4rem] z-20 mb-3 hidden border-y border-[#27363d] bg-[#111a1e]/95 py-2 backdrop-blur lg:block">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[#2a3941] bg-[#182329] px-2 py-0.5 text-[11px] font-semibold text-[#9db0b8]">
                  {activeFilterCount}
                </span>
                <ActiveFilterBar {...activeFilterBarProps} />
              </div>
            </div>
            {ROBEO_BP_MODE ? (
              <div className="mb-4 hidden lg:block">
                {user ? <HomeDistrictPicker className="mb-3" /> : null}
                <DistrictDiscoveryRail
                  browsePath={browsePath}
                  catalogFilters={catalogFilters}
                  maxPriceLimit={maxPriceLimit}
                  selectedDistrict={selectedBudapestDistrict}
                  onDistrictPick={setSelectedBudapestDistrict}
                />
              </div>
            ) : null}
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
                categoryCounts={filterCounts.categories}
              />
              <SavedSearchesStrip
                filters={catalogFilters}
                hasActiveFilters={hasActiveFilters}
                onApply={applySavedSearch}
              />
              <ListingTypeToggle
                value={selectedListingType}
                onChange={setSelectedListingType}
                className="mb-2"
              />
              <BrowseDiscoveryRails {...discoveryProps} hacooCard />
            </div>
            {productGridBlock}
          </div>
        </div>
      ) : null}

      <ImmersiveFilterSheet
        catalogFilters={catalogFilters}
        filtersMeta={filtersMeta}
        activeFilterCount={activeFilterCount}
        onApplyFilters={applyCatalogFilters}
        onApply={() => {
          if (typeof document !== 'undefined') {
            document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
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
