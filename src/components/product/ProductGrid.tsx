'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import ProductCard from './ProductCard';
import FeedLcpPreloader from './FeedLcpPreloader';
import ProductGridSkeleton from './ProductGridSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ListRefreshingBar from '@/components/ui/ListRefreshingBar';
import { useProductGridColumns } from '@/hooks/useProductGridColumns';
import ZeroResultsRescue from '@/components/browse/ZeroResultsRescue';
import type { Product } from '@/types';

import {
  FEED_VIEWPORT_PRIORITY_COUNT,
  type ImagePresetName,
} from '@/lib/imagePresets';

const GRID_GAP_PX = 6;
const ROW_HEIGHT_ESTIMATE = 320;
const VIRTUAL_OVERSCAN = 3;
/** Kevesebb sor — egyszerű grid, stabilabb layout shift. */
const VIRTUAL_MIN_ROWS = 5;

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  refreshing?: boolean;
  favorites: Set<string>;
  onToggleFavorite: (productId: string) => void;
  transitionKey?: string;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  listingType?: 'all' | 'product' | 'service';
  districtLabel?: string;
  onClearDistrict?: () => void;
  cardImagePreset?: ImagePresetName;
  priorityCount?: number;
  /** @deprecated virtual grid renders all loaded rows — kept for API compat */
  initialRenderCount?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  searchQuery?: string;
  selectedCategory?: string;
  selectedBrand?: string;
  onApplySearch?: (query: string) => void;
}

export default function ProductGrid({
  products,
  loading,
  refreshing = false,
  favorites,
  onToggleFavorite,
  transitionKey = 'default',
  hasActiveFilters = false,
  onClearFilters,
  listingType = 'all',
  districtLabel,
  onClearDistrict,
  cardImagePreset = 'feedCard',
  priorityCount = FEED_VIEWPORT_PRIORITY_COUNT,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  searchQuery = '',
  selectedCategory = 'all',
  selectedBrand = 'all',
  onApplySearch,
}: ProductGridProps) {
  const { t } = useTranslation();
  const columnCount = useProductGridColumns();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const loadMoreLockRef = useRef(false);

  const rowCount = useMemo(
    () => Math.ceil(products.length / columnCount),
    [products.length, columnCount],
  );

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setScrollMargin(rect.top + window.scrollY);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [transitionKey, products.length, loading]);

  const useVirtual = rowCount >= VIRTUAL_MIN_ROWS;

  const rowVirtualizer = useWindowVirtualizer({
    count: useVirtual ? rowCount : 0,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: VIRTUAL_OVERSCAN,
    scrollMargin,
    gap: GRID_GAP_PX,
    measureElement:
      typeof window !== 'undefined' && 'ResizeObserver' in window
        ? (el) => el.getBoundingClientRect().height
        : undefined,
  });

  useEffect(() => {
    if (!useVirtual) return;
    rowVirtualizer.scrollToOffset(0);
  }, [transitionKey, useVirtual]);

  useEffect(() => {
    if (!useVirtual) return;
    rowVirtualizer.measure();
  }, [columnCount, useVirtual]);

  const virtualRows = useVirtual ? rowVirtualizer.getVirtualItems() : [];

  const lcpProducts = useMemo(() => {
    if (products.length === 0) return [];
    const firstRow = virtualRows[0];
    if (!firstRow) return products.slice(0, priorityCount);
    const start = firstRow.index * columnCount;
    return products.slice(start, start + columnCount * 2);
  }, [virtualRows, products, columnCount, priorityCount]);

  useEffect(() => {
    if (!hasMore || loadingMore || !onLoadMore) return;
    const target = loadMoreSentinelRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (loadMoreLockRef.current) return;
        loadMoreLockRef.current = true;
        onLoadMore();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore, products.length, useVirtual]);

  useEffect(() => {
    if (!loadingMore) loadMoreLockRef.current = false;
  }, [loadingMore]);

  if (loading && products.length === 0) {
    return <ProductGridSkeleton />;
  }

  if (products.length === 0) {
    if (districtLabel) {
      return (
        <div>
          <EmptyState
            icon="search"
            title={t('browse.empty.districtTitle', { district: districtLabel })}
            description={t('browse.empty.districtDescription', { district: districtLabel })}
            actionLabel={t('browse.empty.viewAllDistricts')}
            onAction={onClearDistrict ?? onClearFilters}
          />
          <div className="-mt-8 mb-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/browse?sort=newest#catalog"
              className="rounded-full border border-[#2a3941] bg-[#1a2328] px-3 py-1.5 text-xs font-semibold text-[#b2c0c6] hover:border-[#38c7d0]/35 hover:text-[#38c7d0]"
            >
              {t('browse.empty.exploreFresh')}
            </Link>
            <Link
              href="/favorites"
              className="rounded-full border border-[#2a3941] bg-[#1a2328] px-3 py-1.5 text-xs font-semibold text-[#b2c0c6] hover:border-[#38c7d0]/35 hover:text-[#38c7d0]"
            >
              {t('browse.empty.openWatchlist')}
            </Link>
          </div>
          <ZeroResultsRescue
            searchQuery={searchQuery}
            category={selectedCategory}
            brand={selectedBrand}
            onApplySearch={onApplySearch}
            onClearFilters={onClearDistrict ?? onClearFilters}
          />
        </div>
      );
    }

    const isService = listingType === 'service';
    const emptyTitle = hasActiveFilters
      ? t('browse.empty.filteredTitle')
      : isService
        ? t('browse.empty.servicesTitle')
        : t('browse.empty.title');
    const emptyDescription = hasActiveFilters
      ? t('browse.empty.filteredDescription')
      : isService
        ? t('browse.empty.servicesDescription')
        : t('browse.empty.description');
    const emptyAction = hasActiveFilters
      ? t('browse.empty.clearFilters')
      : isService
        ? t('browse.empty.browseAllServices')
        : t('browse.empty.browseAll');

    return (
      <div>
        <EmptyState
          icon="search"
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyAction}
          actionHref={hasActiveFilters ? undefined : isService ? '/browse?type=service' : '/browse'}
          onAction={hasActiveFilters ? onClearFilters : undefined}
        />
        <div className="-mt-8 mb-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/browse#catalog"
            className="rounded-full border border-[#2a3941] bg-[#1a2328] px-3 py-1.5 text-xs font-semibold text-[#b2c0c6] hover:border-[#38c7d0]/35 hover:text-[#38c7d0]"
          >
            {t('browse.empty.tryBroader')}
          </Link>
          <Link
            href="/favorites"
            className="rounded-full border border-[#2a3941] bg-[#1a2328] px-3 py-1.5 text-xs font-semibold text-[#b2c0c6] hover:border-[#38c7d0]/35 hover:text-[#38c7d0]"
          >
            {t('browse.empty.openWatchlist')}
          </Link>
          <Link
            href="/messages"
            className="rounded-full border border-[#2a3941] bg-[#1a2328] px-3 py-1.5 text-xs font-semibold text-[#b2c0c6] hover:border-[#38c7d0]/35 hover:text-[#38c7d0]"
          >
            {t('browse.empty.openMessages')}
          </Link>
        </div>
        <ZeroResultsRescue
          searchQuery={searchQuery}
          category={selectedCategory}
          brand={selectedBrand}
          onApplySearch={onApplySearch}
          onClearFilters={hasActiveFilters ? onClearFilters : undefined}
        />
      </div>
    );
  }

  const simpleGrid = (
    <div
      className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-5 xl:grid-cols-6 lg:gap-3"
    >
      {products.map((product, index) => (
        <ProductCard
          key={`${product.id}-${index}`}
          product={product}
          isFavorite={favorites.has(product.id)}
          onToggleFavorite={() => onToggleFavorite(product.id)}
          priority={index < priorityCount}
          imagePreset={cardImagePreset}
          compact
        />
      ))}
    </div>
  );

  return (
    <>
      <FeedLcpPreloader products={lcpProducts} preset={cardImagePreset} count={priorityCount} />
      <ListRefreshingBar active={refreshing} />
      {!useVirtual ? (
        <div key={transitionKey}>
          {simpleGrid}
          {hasMore ? <div ref={loadMoreSentinelRef} className="h-4 w-full" aria-hidden /> : null}
        </div>
      ) : (
      <div ref={gridRef} key={transitionKey} className="relative w-full">
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {virtualRows.map((virtualRow) => {
            const startIndex = virtualRow.index * columnCount;
            const rowProducts = products.slice(startIndex, startIndex + columnCount);

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{
                  transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                }}
              >
                <div
                  className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-5 xl:grid-cols-6 lg:gap-3"
                  style={{ paddingBottom: virtualRow.index < rowCount - 1 ? GRID_GAP_PX : 0 }}
                >
                  {rowProducts.map((product, colIndex) => {
                    const globalIndex = startIndex + colIndex;
                    return (
                      <ProductCard
                        key={`${product.id}-${globalIndex}`}
                        product={product}
                        isFavorite={favorites.has(product.id)}
                        onToggleFavorite={() => onToggleFavorite(product.id)}
                        priority={globalIndex < priorityCount}
                        imagePreset={cardImagePreset}
                        compact
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
      {useVirtual && hasMore ? (
        <div ref={loadMoreSentinelRef} className="h-4 w-full" aria-hidden />
      ) : null}
      {loadingMore ? (
        <p className="mt-4 text-center text-xs text-[#8fa3ad]">{t('landing.catalog.loadingMore')}</p>
      ) : null}
    </>
  );
}
