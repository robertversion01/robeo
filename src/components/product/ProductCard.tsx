'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, MapPin, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, formatPrice } from '@/lib/utils';
import { getDistrictLabel } from '@/lib/budapestDistricts';
import { categoryDisplayLabel } from '@/lib/categoryDisplay';
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from '@/lib/imageUtils';
import { normalizePrimaryProductImageUrl } from '@/lib/productImageValidation';
import { getListingAgeBadge, getProductCardImages } from '@/lib/productListingBadges';
import ProductImage from '@/components/product/ProductImage';
import Badge from '@/components/ui/Badge';
import type { ProductWithSeller } from '@/lib/sellerCardEnrichment';

interface ProductCardProps {
  product: ProductWithSeller;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  /** Above-the-fold kártya: azonnali (eager) + magas prioritású képbetöltés. */
  priority?: boolean;
}

export default function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  priority = false,
}: ProductCardProps) {
  const { t } = useTranslation();
  const cardImages = getProductCardImages(product);
  const primaryImage = normalizePrimaryProductImageUrl(product) || cardImages[0];
  const [imageVisible, setImageVisible] = useState(true);
  const [heartBump, setHeartBump] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [nowMs] = useState(() => Date.now());
  const touchStartX = useRef<number | null>(null);

  const displayImage = cardImages[imageIndex] || primaryImage;

  const cycleImage = useCallback(
    (delta: number) => {
      if (cardImages.length <= 1) return;
      setImageIndex((prev) => (prev + delta + cardImages.length) % cardImages.length);
    },
    [cardImages.length],
  );

  if (!displayImage || !imageVisible) return null;

  const isFeatured =
    typeof product.featured_until === 'string' &&
    new Date(product.featured_until).getTime() > nowMs;

  const brandOrName = product.brand || product.name;
  const sizePart = product.size || '—';
  const categoryShort = categoryDisplayLabel(t, product.category);

  const isSold = product.status === 'sold';
  const isReserved = product.status === 'reserved';
  const ageBadge = getListingAgeBadge(product, nowMs);
  const favoriteCount = Math.max(0, Number(product.favorite_count) || 0);
  const districtLabel = getDistrictLabel(product.budapest_district);
  const sellerName = product.sellerName;
  const sellerInitial = sellerName?.trim()?.charAt(0)?.toUpperCase() || '?';
  const cardImageOptions = { height: 400, resize: 'cover' as const };
  const cardSrcSet = getOptimizedImageSrcSet(displayImage, [200, 260, 320, 400], 72, cardImageOptions);

  return (
    <div className="group card-base overflow-hidden rounded-lg sm:rounded-xl transition-all duration-200 relative border-0 sm:border sm:border-gray-100 hover:border-[#007782]/40 hover:shadow-md active:scale-[0.98] touch-manipulation">
      <Link
        href={`/products/${product.id}`}
        className="relative aspect-[4/5] overflow-hidden block bg-[#0f1a1d]/5"
        onMouseEnter={() => {
          if (cardImages.length > 1) setImageIndex(1 % cardImages.length);
        }}
        onMouseLeave={() => setImageIndex(0)}
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          const end = e.changedTouches[0]?.clientX;
          touchStartX.current = null;
          if (start == null || end == null) return;
          const delta = end - start;
          if (Math.abs(delta) < 30) return;
          cycleImage(delta < 0 ? 1 : -1);
        }}
      >
        <ProductImage
          src={getOptimizedImageUrl(displayImage, 320, 72, cardImageOptions)}
          srcSet={cardSrcSet}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
          alt={product.name}
          width={320}
          height={400}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          className={cn(
            'w-full h-full object-cover',
            isSold && 'opacity-60 grayscale',
            isReserved && !isSold && 'opacity-90',
          )}
          onError={() => setImageVisible(false)}
        />
        {cardImages.length > 1 ? (
          <div className="pointer-events-none absolute bottom-1 right-1 flex gap-0.5">
            {cardImages.slice(0, 5).map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  'h-1 w-1 rounded-full',
                  idx === imageIndex ? 'bg-white' : 'bg-white/50',
                )}
              />
            ))}
          </div>
        ) : null}
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
        ) : ageBadge ? (
          <span className="pointer-events-none absolute top-1 left-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            {ageBadge === 'just_now' ? t('product.badgeJustNow') : t('product.badgeNew')}
          </span>
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
        {sellerName ? (
          <Link
            href={`/profile/${product.user_id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-[#007782] truncate"
          >
            {product.sellerAvatarUrl ? (
              <img
                src={getOptimizedImageUrl(product.sellerAvatarUrl, 32, 75)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-4 w-4 rounded-full object-cover shrink-0"
              />
            ) : (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#007782]/10 text-[9px] font-bold text-[#007782]">
                {sellerInitial}
              </span>
            )}
            <span className="truncate">{sellerName}</span>
            {product.sellerVerified ? (
              <BadgeCheck
                size={12}
                className="shrink-0 text-[#007782]"
                aria-label={t('sellerTrust.verified')}
              />
            ) : null}
          </Link>
        ) : null}
        {districtLabel ? (
          <p className="flex items-center gap-0.5 text-[10px] font-medium text-[#007782] truncate leading-none">
            <MapPin size={10} className="shrink-0" aria-hidden />
            {districtLabel}
          </p>
        ) : categoryShort ? (
          <p className="text-[10px] uppercase tracking-wide text-gray-400 truncate leading-none">
            {categoryShort}
          </p>
        ) : null}
      </div>
    </div>
  );
}
