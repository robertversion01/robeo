'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import ProductCard from './ProductCard';
import ProductGridSkeleton from './ProductGridSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ListRefreshingBar from '@/components/ui/ListRefreshingBar';
import type { Product } from '@/types';

import {
  FEED_INITIAL_RENDER_COUNT,
  FEED_VIEWPORT_PRIORITY_COUNT,
  type ImagePresetName,
} from '@/lib/imagePresets';

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
  /** RobeoBP — aktív kerület címke (üres-állapot üzenethez). */
  districtLabel?: string;
  /** RobeoBP — csak a kerület-szűrő törlése (a többit megtartja). */
  onClearDistrict?: () => void;
  /** Főoldal vs browse kép preset */
  cardImagePreset?: ImagePresetName;
  /** Első N kártya eager/high priority */
  priorityCount?: number;
  /** Kezdeti renderelt kártyaszám (hálózati terhelés) */
  initialRenderCount?: number;
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
  priorityCount = 4,
  initialRenderCount = FEED_INITIAL_RENDER_COUNT,
}: ProductGridProps) {
  const { t } = useTranslation();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [renderLimit, setRenderLimit] = useState(initialRenderCount);

  const displayProducts = products;
  const windowedProducts = useMemo(
    () => displayProducts.slice(0, Math.min(renderLimit, displayProducts.length)),
    [displayProducts, renderLimit],
  );

  useEffect(() => {
    if (loading) return;
    const target = loadMoreRef.current;
    if (!target) return;
    if (windowedProducts.length >= displayProducts.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        setRenderLimit((prev) => Math.min(prev + initialRenderCount, displayProducts.length));
      },
      { rootMargin: '280px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [displayProducts.length, initialRenderCount, loading, windowedProducts.length]);

  if (loading && products.length === 0) {
    return <ProductGridSkeleton />;
  }

  if (displayProducts.length === 0) {
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
      </div>
    );
  }

  return (
    <>
      <ListRefreshingBar active={refreshing} />
      <div
        key={transitionKey}
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-5 xl:grid-cols-6 lg:gap-3"
      >
        {windowedProducts.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            isFavorite={favorites.has(product.id)}
            onToggleFavorite={() => onToggleFavorite(product.id)}
            priority={index < priorityCount}
            imagePreset={cardImagePreset}
          />
        ))}
      </div>
      {windowedProducts.length < displayProducts.length ? (
        <div ref={loadMoreRef} className="h-2 w-full" />
      ) : null}
    </>
  );
}
