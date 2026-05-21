'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { normalizePrimaryProductImageUrl } from '@/lib/productImageValidation';
import ProductImage from '@/components/product/ProductImage';
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

  const brandLabel = product.brand?.trim() || '';
  const sizeLabel = product.size?.trim() || '';

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
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.07] group-active:scale-[1.04]"
          onError={() => setImageVisible(false)}
        />

        {isFeatured ? (
          <span className="pointer-events-none absolute top-1 left-1 z-10 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white bg-[#007782] shadow-sm">
            {t('product.featured')}
          </span>
        ) : null}

        {(sizeLabel || brandLabel) ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-1 px-1.5 pb-1.5 pt-8 bg-gradient-to-t from-black/50 via-black/20 to-transparent">
            {sizeLabel ? (
              <span className="shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white bg-black/40 backdrop-blur-[2px]">
                {sizeLabel}
              </span>
            ) : (
              <span className="shrink-0" />
            )}
            {brandLabel ? (
              <span className="min-w-0 max-w-[58%] truncate rounded-sm px-1.5 py-0.5 text-[10px] font-semibold text-white/95 bg-black/35 backdrop-blur-[2px] text-right">
                {brandLabel}
              </span>
            ) : null}
          </div>
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
          'absolute top-0.5 right-0.5 z-20 h-7 w-7 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-sm border',
          isFavorite
            ? 'bg-rose-50 border-rose-200/90'
            : 'bg-white/95 backdrop-blur-sm border-gray-200/80 hover:bg-white',
        )}
        aria-label={isFavorite ? t('product.favoriteRemove') : t('product.favoriteAdd')}
      >
        <Heart
          size={14}
          className={cn(
            'transition-all duration-200',
            isFavorite
              ? 'fill-rose-500 text-rose-500 scale-110'
              : 'fill-transparent text-gray-500 group-hover:text-rose-400',
          )}
        />
      </button>

      <div className="px-1 pt-1 pb-1.5 text-left">
        <div className="text-[15px] sm:text-base font-extrabold text-[#007782] tabular-nums leading-tight tracking-tight">
          {formatPrice(product.price)}
        </div>
      </div>
    </div>
  );
}
