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
      className="group bg-card/50 backdrop-blur-sm border border-border hover:border-accent/30 rounded-xl overflow-hidden hover:bg-card/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-accent/5 relative"
    >
      <Link href={`/products/${product.id}`} className="aspect-[4/5] overflow-hidden block">
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

      <div className="p-2">
        <div className="text-accent font-bold text-xl">{formatPrice(product.price)}</div>
        <h3 className="font-medium text-sm truncate mt-0.5">{product.name}</h3>
        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
          {product.category}
        </div>
      </div>
    </div>
  );
}