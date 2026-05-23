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
  const [heartBump, setHeartBump] = useState(false);

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
    <div className="group card-base overflow-hidden rounded-lg sm:rounded-xl transition-all duration-200 relative border-0 sm:border sm:border-gray-100 hover:border-[#007782]/40 hover:shadow-md active:scale-[0.98] touch-manipulation">
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
          setHeartBump(true);
          window.setTimeout(() => setHeartBump(false), 420);
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
          'shrink-0 transition-all duration-200',
          heartBump && 'scale-125',
          isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'fill-transparent text-gray-500',
        )}
        />
        {favoriteCount > 0 ? (
          <span className="text-[10px] font-semibold tabular-nums leading-none text-gray-600">
            {favoriteCount}
          </span>
        ) : null}
      </button>

      <div className="px-1.5 pt-1 pb-1.5 sm:px-2 sm:pt-1.5 sm:pb-2 text-left space-y-0.5 sm:space-y-1">
        <div className="text-[15px] sm:text-base font-extrabold text-[#007782] tabular-nums leading-tight tracking-tight">
          {formatPrice(product.price)}
        </div>
        <p className="text-[11px] sm:text-xs text-gray-600 leading-snug truncate">
          <span className="font-medium text-gray-800">{brandOrName}</span>
          <span className="text-gray-400 mx-0.5">·</span>
          <span className="text-gray-500">{sizePart}</span>
        </p>
        {categoryShort ? (
          <p className="text-[10px] uppercase tracking-wide text-gray-400 truncate leading-none">
            {categoryShort}
          </p>
        ) : null}
      </div>
    </div>
  );
}
