'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function ProductCard({ product, isFavorite, onToggleFavorite }: ProductCardProps) {
  return (
    <div 
      className="group bg-white dark:bg-card/50 dark:backdrop-blur-sm border border-gray-100 dark:border-border hover:border-accent/30 rounded-lg overflow-hidden transition-all duration-200 relative"
    >
      <Link href={`/products/${product.id}`} className="aspect-[4/5] overflow-hidden block">
        {product.image_url ? (
          <img 
            src={getOptimizedImageUrl(product.image_url, 300, 85)} 
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-muted flex items-center justify-center text-gray-400 dark:text-muted-foreground">
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
        className="absolute top-1.5 right-1.5 z-50 w-6 h-6 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-white dark:hover:bg-black/60 transition-colors shadow-sm"
      >
        <Heart 
          size={13} 
          className={cn(
            "transition-colors",
            isFavorite ? "fill-rose-500 text-rose-500" : "fill-transparent text-gray-500 dark:text-white"
          )}
        />
      </button>

      <div className="p-1.5 space-y-0.5">
        <div className="text-accent font-bold text-xs">{formatPrice(product.price)}</div>
        <h3 className="font-medium text-[11px] truncate leading-tight text-gray-800 dark:text-white">{product.name}</h3>
        <div className="flex items-center gap-1 flex-wrap">
          {product.size && (
            <span className="text-[9px] bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-gray-600 dark:text-gray-300">
              {product.size}
            </span>
          )}
          {product.brand && (
            <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate max-w-[80px]">
              {product.brand}
            </span>
          )}
        </div>
        <div className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {product.category}
        </div>
      </div>
    </div>
  );
}