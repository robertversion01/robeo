'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function ProductCard({ product, isFavorite, onToggleFavorite }: ProductCardProps) {
  return (
    <div 
      className="group bg-card/50 backdrop-blur-sm border border-border hover:border-accent/30 rounded-2xl overflow-hidden hover:bg-card/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/5 relative"
    >
      <Link href={`/products/${product.id}`} className="aspect-square overflow-hidden block">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
            📷
          </div>
        )}
      </Link>

      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggleFavorite();
        }}
        className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
      >
        <Heart 
          size={18} 
          className={cn(
            "transition-colors",
            isFavorite ? "fill-accent text-accent" : "fill-transparent text-white"
          )}
        />
      </button>

      <div className="p-4">
        <div className="text-xs text-accent mb-1 uppercase tracking-wider">
          {product.category}
        </div>
        <h3 className="font-semibold text-lg truncate mb-1">{product.name}</h3>
        <div className="text-accent font-bold text-xl">{formatPrice(product.price)}</div>
      </div>
    </div>
  );
}