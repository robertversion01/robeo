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
import { calculateCheckoutTotal } from '@/lib/buyerProtection';
import { VINTED_CONDITIONS } from '@/lib/vintedCatalog';
import type { Product } from '@/types';

export type ProductCardVariant = 'default' | 'vintedFeed';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  variant?: ProductCardVariant;
}

function conditionLabel(condition: string | null | undefined): string | null {
  if (!condition?.trim()) return null;
  const normalized = condition
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const match = VINTED_CONDITIONS.find((c) =>
    c.aliases.some((alias) => {
      const a = alias
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      return normalized === a || normalized.includes(a);
    }),
  );
  return match?.label ?? condition;
}

export default function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  variant = 'default',
}: ProductCardProps) {
  const { t } = useTranslation();
  const feedMobile = variant === 'vintedFeed';
  const primaryImage = normalizePrimaryProductImageUrl(product);
  const [imageVisible, setImageVisible] = useState(true);
  const [heartBump, setHeartBump] = useState(false);
  const [nowMs] = useState(() => Date.now());

  if (!primaryImage || !imageVisible) return null;

  const isFeatured =
    typeof product.featured_until === 'string' &&
    new Date(product.featured_until).getTime() > nowMs;

  const brandOrName = product.brand || product.name;
  const sizePart = product.size || '—';
  const conditionPart = conditionLabel(product.condition);
  const categoryShort =
    typeof product.category === 'string' ? product.category.replace(/_/g, ' ') : '';

  const isSold = product.status === 'sold';
  const isReserved = product.status === 'reserved';
  const favoriteCount = Math.max(0, Number(product.favorite_count) || 0);
  const checkoutTotal = calculateCheckoutTotal(product.price).total;

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setHeartBump(true);
    window.setTimeout(() => setHeartBump(false), 420);
    onToggleFavorite();
  };

  const renderHeartButton = (placement: 'mobileFeed' | 'default') => (
    <button
      type="button"
      onClick={toggleFavorite}
      className={cn(
        'absolute z-50 flex items-center gap-0.5 rounded-full backdrop-blur-sm transition-transform touch-manipulation active:scale-90',
        placement === 'mobileFeed'
          ? cn(
              'bottom-1.5 right-1.5 md:hidden',
              favoriteCount > 0 ? 'h-7 min-w-[1.75rem] px-1.5' : 'h-7 w-7 justify-center',
              'bg-black/45 hover:bg-black/55',
            )
          : cn(
              'top-0.5 right-0.5 bg-white/95 hover:bg-white shadow-sm border border-gray-200/80',
              feedMobile && 'hidden md:flex',
              favoriteCount > 0 ? 'h-7 min-w-[1.75rem] px-1.5' : 'h-7 w-7 justify-center',
            ),
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
          isFavorite
            ? 'fill-rose-500 text-rose-500 scale-110'
            : placement === 'mobileFeed'
              ? 'fill-transparent text-white'
              : 'fill-transparent text-gray-500',
        )}
      />
      {favoriteCount > 0 ? (
        <span
          className={cn(
            'text-[10px] font-semibold tabular-nums leading-none',
            placement === 'mobileFeed' ? 'text-white' : 'text-gray-600',
          )}
        >
          {favoriteCount}
        </span>
      ) : null}
    </button>
  );

  return (
    <div
      className={cn(
        'group relative overflow-hidden touch-manipulation transition-all duration-200',
        feedMobile
          ? 'max-md:rounded-md max-md:bg-transparent md:card-base md:rounded-xl md:border md:border-gray-100 md:hover:border-[#007782]/40 md:hover:shadow-md md:active:scale-[0.98]'
          : 'card-base rounded-lg sm:rounded-xl border-0 sm:border sm:border-gray-100 hover:border-[#007782]/40 hover:shadow-md active:scale-[0.98]',
      )}
    >
      <Link
        href={`/products/${product.id}`}
        className={cn(
          'relative block overflow-hidden',
          feedMobile
            ? 'aspect-[3/4] max-md:rounded-md max-md:bg-[#1c1c1e] md:aspect-[4/5] md:bg-[#0f1a1d]/5'
            : 'aspect-[3/4] sm:aspect-[4/5] bg-[#0f1a1d]/5',
        )}
      >
        <ProductImage
          src={getOptimizedImageUrl(primaryImage, 320, 82)}
          alt={product.name}
          loading="lazy"
          className={cn(
            'h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.07] group-active:scale-[1.04]',
            isSold && 'opacity-60 grayscale',
            isReserved && !isSold && 'opacity-90',
          )}
          onError={() => setImageVisible(false)}
        />
        {isSold ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
            <span className="rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {t('product.sold')}
            </span>
          </div>
        ) : isReserved ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="rounded-md bg-amber-600/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {t('product.reserved')}
            </span>
          </div>
        ) : null}
        {isFeatured ? (
          <Badge
            variant="featured"
            className="pointer-events-none absolute bottom-1 left-1 text-[9px] px-1 py-0.5"
          >
            {t('product.featured')}
          </Badge>
        ) : null}
        {feedMobile ? renderHeartButton('mobileFeed') : null}
      </Link>

      {feedMobile ? renderHeartButton('default') : renderHeartButton('default')}

      {feedMobile ? (
        <div className="max-md:space-y-0.5 max-md:px-0.5 max-md:pt-1.5 max-md:pb-1 max-md:text-left md:hidden">
          <p className="truncate text-[13px] font-semibold leading-tight text-white">{brandOrName}</p>
          <p className="truncate text-[11px] leading-snug text-gray-400">
            {sizePart}
            {conditionPart ? (
              <>
                <span className="mx-0.5">·</span>
                {conditionPart}
              </>
            ) : null}
          </p>
          <div className="space-y-0.5 pt-0.5">
            <div className="text-[15px] font-bold tabular-nums leading-tight tracking-tight text-white">
              {formatPrice(product.price)}
            </div>
            <div className="text-[11px] font-medium tabular-nums leading-tight text-[#007782]">
              {t('product.totalWithProtection', { total: formatPrice(checkoutTotal) })}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'space-y-0.5 text-left',
          feedMobile
            ? 'hidden px-2 pt-1.5 pb-2 md:block md:space-y-1'
            : 'px-1.5 pt-1 pb-1.5 sm:px-2 sm:pt-1.5 sm:pb-2 sm:space-y-1',
        )}
      >
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
