'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { normalizePrimaryProductImageUrl } from '@/lib/productImageValidation';
import ProductImage from '@/components/product/ProductImage';
import Badge from '@/components/ui/Badge';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function ProductCard({ product, isFavorite, onToggleFavorite }: ProductCardProps) {
  const { t } = useTranslation();
  const primaryImage = normalizePrimaryProductImageUrl(product);
  const [imageVisible, setImageVisible] = useState(true);

  if (!primaryImage || !imageVisible) return null;

  const isFeatured =
    typeof product.featured_until === 'string' &&
    new Date(product.featured_until).getTime() > Date.now();

  const brandOrName = product.brand || product.name;
  const sizePart = product.size || '—';
  const categoryShort =
    typeof product.category === 'string' ? product.category.replace(/_/g, ' ') : '';

  const isSold = product.status === 'sold';
  const favoriteCount = Math.max(0, Number(product.favorite_count) || 0);

  return (
    <div className="group card-base overflow-hidden transition-all duration-200 relative border border-gray-200/90 hover:border-[#007782]/50 hover:shadow-md active:scale-[0.98] touch-manipulation">
      <Link
        href={`/products/${product.id}`}
        className="relative aspect-[3/4] sm:aspect-[4/5] overflow-hidden block bg-[#0f1a1d]/5"
      >
        <ProductImage
          src={getOptimizedImageUrl(primaryImage, 320, 82)}
          alt={product.name}
          loading="lazy"
          className={cn(
            'w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.07] group-active:scale-[1.04]',
            isSold && 'opacity-60 grayscale',
          )}
          onError={() => setImageVisible(false)}
        />
        {isSold ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
            <span className="rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {t('product.sold')}
            </span>
          </div>
        ) : null}
        {isFeatured ? (
          <Badge variant="featured" className="pointer-events-none absolute bottom-1 left-1 text-[9px] px-1 py-0.5">
            {t('product.featured')}
          </Badge>
        ) : null}
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggleFavorite();
        }}
        className={cn(
          'absolute top-0.5 right-0.5 z-50 flex items-center gap-0.5 rounded-full bg-white/95 backdrop-blur-sm hover:bg-white active:scale-90 transition-transform shadow-sm border border-gray-200/80',
          favoriteCount > 0 ? 'h-7 min-w-[1.75rem] px-1.5' : 'h-7 w-7 justify-center',
        )}
        aria-label={
          favoriteCount > 0
            ? t('product.favoriteCountAria', { count: favoriteCount })
            : isFavorite
              ? t('product.favoriteRemove')
              : t('product.favoriteAdd')
        }
      >
        <Heart
          size={14}
          className={cn(
            'shrink-0 transition-colors',
            isFavorite ? 'fill-rose-500 text-rose-500' : 'fill-transparent text-gray-500',
          )}
        />
        {favoriteCount > 0 ? (
          <span className="text-[10px] font-semibold tabular-nums leading-none text-gray-600">
            {favoriteCount}
          </span>
        ) : null}
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
