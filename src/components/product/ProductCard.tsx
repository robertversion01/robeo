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
      className="group bg-card/50 backdrop-blur-sm border border-border hover:border-accent/30 rounded-lg overflow-hidden transition-all duration-200 relative"
    >
      <Link href={`/products/${product.id}`} className="aspect-[4/5] overflow-hidden block">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            loading="lazy"
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
        className="absolute top-2 right-2 z-50 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
      >
        <Heart 
          size={15} 
          className={cn(
            "transition-colors",
            isFavorite ? "fill-accent text-accent" : "fill-transparent text-white"
          )}
        />
      </button>

      <div className="p-1.5">
        <div className="text-accent font-bold text-sm md:text-base">{formatPrice(product.price)}</div>
        <h3 className="font-medium text-xs truncate mt-0.5">{product.name}</h3>
        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
          {product.category}
        </div>
      </div>
    </div>
  );
}