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
      className="group bg-white border border-gray-200 rounded-md overflow-hidden transition-colors duration-200 relative"
    >
      <Link href={`/products/${product.id}`} className="aspect-[4/5] overflow-hidden block">
        {product.image_url ? (
          <img 
            src={getOptimizedImageUrl(product.image_url, 300, 85)} 
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
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
        className="absolute top-1.5 right-1.5 z-50 w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm"
      >
        <Heart 
          size={13} 
          className={cn(
            "transition-colors",
            isFavorite ? "fill-rose-500 text-rose-500" : "fill-transparent text-gray-500"
          )}
        />
      </button>

      <div className="p-2 space-y-0.5 text-left">
        <div className="font-bold text-sm text-gray-900">{formatPrice(product.price)}</div>
        <div className="text-xs text-gray-800 truncate">{product.brand || product.name}</div>
        <div className="text-xs text-gray-500 truncate">{product.size || 'Meret nincs megadva'}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">
          {product.category}
        </div>
      </div>
    </div>
  );
}