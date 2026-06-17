'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ProductCard from './ProductCard';
import ProductGridSkeleton from './ProductGridSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import type { Product } from '@/types';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
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
}

export default function ProductGrid({
  products,
  loading,
  favorites,
  onToggleFavorite,
  transitionKey = 'default',
  hasActiveFilters = false,
  onClearFilters,
  listingType = 'all',
  districtLabel,
  onClearDistrict,
}: ProductGridProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  const skipNextFadeRef = useRef(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [renderLimit, setRenderLimit] = useState(24);

  useEffect(() => {
    if (skipNextFadeRef.current) {
      skipNextFadeRef.current = false;
      return;
    }
    setVisible(false);
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [transitionKey]);

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
        setRenderLimit((prev) => Math.min(prev + 24, displayProducts.length));
      },
      { rootMargin: '500px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [displayProducts.length, loading, windowedProducts.length]);

  if (loading) {
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
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#007782]/35 hover:text-[#007782]"
            >
              {t('browse.empty.exploreFresh')}
            </Link>
            <Link
              href="/favorites"
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#007782]/35 hover:text-[#007782]"
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
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#007782]/35 hover:text-[#007782]"
          >
            {t('browse.empty.tryBroader')}
          </Link>
          <Link
            href="/favorites"
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#007782]/35 hover:text-[#007782]"
          >
            {t('browse.empty.openWatchlist')}
          </Link>
          <Link
            href="/messages"
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#007782]/35 hover:text-[#007782]"
          >
            {t('browse.empty.openMessages')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={false}
        animate={{ opacity: visible ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-5 xl:grid-cols-6 lg:gap-3"
      >
        {windowedProducts.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            isFavorite={favorites.has(product.id)}
            onToggleFavorite={() => onToggleFavorite(product.id)}
            priority={index < 8}
          />
        ))}
      </motion.div>
      {windowedProducts.length < displayProducts.length ? (
        <div ref={loadMoreRef} className="h-2 w-full" />
      ) : null}
    </AnimatePresence>
  );
}
