'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
}

export default function ProductGrid({
  products,
  loading,
  favorites,
  onToggleFavorite,
  transitionKey = 'default',
}: ProductGridProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [transitionKey, products.length]);

  if (loading) {
    return <ProductGridSkeleton />;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon="search"
        title="Nincs találat"
        description="Próbáld meg más kategóriát vagy keresőkifejezést!"
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${transitionKey}-${products.length}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 md:gap-2"
      >
        {products.map((product) => (
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