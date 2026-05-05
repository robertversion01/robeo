'use client';

import ProductCard from './ProductCard';
import ProductGridSkeleton from './ProductGridSkeleton';
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
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-xl mb-4">Nincs találat a keresési feltételekre</p>
        <p className="text-sm">Próbáld meg más kategóriát vagy keresőkifejezést!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
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