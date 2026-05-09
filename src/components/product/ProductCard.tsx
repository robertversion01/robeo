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
  const primaryImage =
    product.image_url ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null);
  const isFeatured =
    typeof product.featured_until === 'string' &&
    new Date(product.featured_until).getTime() > Date.now();

  const brandOrName = product.brand || product.name;
  const sizePart = product.size || '—';
  const categoryShort =
    typeof product.category === 'string' ? product.category.replace(/_/g, ' ') : '';

  return (
    <div className="group card-base overflow-hidden transition-all duration-200 relative border border-gray-200/90 hover:border-[#007782]/50 hover:shadow-md active:scale-[0.98] touch-manipulation">
      <Link
        href={`/products/${product.id}`}
        className="relative aspect-[3/4] sm:aspect-[4/5] overflow-hidden block bg-gray-100"
      >
        {primaryImage ? (
          <img
            src={getOptimizedImageUrl(primaryImage, 320, 82)}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.07] group-active:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-lg">
            📷
          </div>
        )}
        {isFeatured ? (
          <span className="pointer-events-none absolute bottom-1 left-1 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white bg-[#007782] shadow-sm">
            Kiemelt
          </span>
        ) : null}
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggleFavorite();
        }}
        className="absolute top-0.5 right-0.5 z-50 h-7 w-7 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-white active:scale-90 transition-transform shadow-sm border border-gray-200/80"
        aria-label={isFavorite ? 'Eltávolítás a kedvencekből' : 'Kedvencekhez adás'}
      >
        <Heart
          size={14}
          className={cn(
            'transition-colors',
            isFavorite ? 'fill-rose-500 text-rose-500' : 'fill-transparent text-gray-500'
          )}
        />
      </button>

      <div className="px-1 pt-1 pb-1.5 text-left space-y-0.5">
        <div className="text-[15px] sm:text-base font-extrabold text-[#007782] tabular-nums leading-tight tracking-tight">
          {formatPrice(product.price)}
        </div>
        <p className="text-[10px] sm:text-[11px] text-gray-600 leading-snug truncate">
          <span className="font-medium text-gray-800">{brandOrName}</span>
          <span className="text-gray-400 mx-0.5">·</span>
          <span className="text-gray-500">{sizePart}</span>
        </p>
        {categoryShort ? (
          <p className="text-[9px] uppercase tracking-wide text-gray-400 truncate leading-none pt-0.5">
            {categoryShort}
          </p>
        ) : null}
      </div>
    </div>
  );
}
