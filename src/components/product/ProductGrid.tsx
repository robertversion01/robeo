'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from './ProductCard';
import ProductGridSkeleton from './ProductGridSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { filterProductsWithValidImages } from '@/lib/productImageValidation';
import type { Product } from '@/types';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  favorites: Set<string>;
  onToggleFavorite: (productId: string) => void;
  transitionKey?: string;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export default function ProductGrid({
  products,
  loading,
  favorites,
  onToggleFavorite,
  transitionKey = 'default',
  hasActiveFilters = false,
  onClearFilters,
}: ProductGridProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [transitionKey]);

  if (loading) {
    return <ProductGridSkeleton />;
  }

  const displayProducts = filterProductsWithValidImages(products);

  if (displayProducts.length === 0) {
    return (
      <EmptyState
        icon="search"
        title={
          hasActiveFilters
            ? t('browse.empty.filteredTitle')
            : t('browse.empty.title')
        }
        description={
          hasActiveFilters
            ? t('browse.empty.filteredDescription')
            : t('browse.empty.description')
        }
        actionLabel={
          hasActiveFilters
            ? t('browse.empty.clearFilters')
            : t('browse.empty.browseAll')
        }
        actionHref={hasActiveFilters ? undefined : '/browse'}
        onAction={hasActiveFilters ? onClearFilters : undefined}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-5 xl:grid-cols-6 lg:gap-3"
      >
        {displayProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isFavorite={favorites.has(product.id)}
            onToggleFavorite={() => onToggleFavorite(product.id)}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
