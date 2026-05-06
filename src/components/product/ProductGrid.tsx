'use client';

import ProductCard from './ProductCard';
import ProductGridSkeleton from './ProductGridSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import type { Product } from '@/types';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  favorites: Set<string>;
  onToggleFavorite: (productId: string) => void;
}

export default function ProductGrid({ products, loading, favorites, onToggleFavorite }: ProductGridProps) {
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFavorite={favorites.has(product.id)}
          onToggleFavorite={() => onToggleFavorite(product.id)}
        />
      ))}
    </div>
  );
}