'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MapPin, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, formatPrice } from '@/lib/utils';
import { getDistrictLabel } from '@/lib/budapestDistricts';
import { categoryDisplayLabel } from '@/lib/categoryDisplay';
import PresetImage from '@/components/product/PresetImage';
import { useFeedImageViewer } from '@/context/FeedImageViewerContext';
import { normalizePrimaryProductImageUrl } from '@/lib/productImageValidation';
import { getListingAgeBadge, getProductCardImages } from '@/lib/productListingBadges';
import { useSnapCarousel } from '@/hooks/useSnapCarousel';
import { useImageGalleryGestures } from '@/hooks/useImageGalleryGestures';
import type { ImagePresetName } from '@/lib/imagePresets';
import Badge from '@/components/ui/Badge';
import type { ProductWithSeller } from '@/lib/sellerCardEnrichment';

interface ProductCardProps {
  product: ProductWithSeller;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  /** Above-the-fold kártya: azonnali (eager) + magas prioritású képbetöltés. */
  priority?: boolean;
  /** Főoldal vs browse feed képminőség */
  imagePreset?: ImagePresetName;
}

export default function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  priority = false,
  imagePreset = 'feedCard',
}: ProductCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const cardImages = getProductCardImages(product);
  const primaryImage = normalizePrimaryProductImageUrl(product) || cardImages[0];
  const [imageVisible, setImageVisible] = useState(true);
  const [heartBump, setHeartBump] = useState(false);
  const [nowMs] = useState(() => Date.now());
  const { openViewer: openFeedViewer, isOpen: viewerOpen } = useFeedImageViewer();

  const images = cardImages.length > 0 ? cardImages : primaryImage ? [primaryImage] : [];

  const { ref: carouselRef, activeIndex, scrollToIndex, handleScroll } = useSnapCarousel(
    images.length,
    { initialIndex: 0 },
  );

  const openProduct = useCallback(() => {
    router.push(`/products/${product.id}`);
  }, [product.id, router]);

  const openViewer = useCallback(() => {
    if (images.length === 0) return;
    openFeedViewer({
      images,
      initialIndex: activeIndex,
      productName: product.name,
    });
  }, [images, activeIndex, product.name, openFeedViewer]);

  const gestures = useImageGalleryGestures({
    onTap: openProduct,
    onOpenViewer: openViewer,
    enabled: images.length > 0 && !viewerOpen,
  });

  useEffect(() => {
    if (images.length <= 1) return;
    const onEnter = () => scrollToIndex(1 % images.length, false);
    const onLeave = () => scrollToIndex(0, false);
    const el = carouselRef.current?.parentElement;
    if (!el) return;
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [carouselRef, images.length, scrollToIndex]);

  if (images.length === 0 || !imageVisible) return null;

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

  return (
    <div
      className="group card-base overflow-hidden rounded-lg sm:rounded-xl transition-all duration-200 relative border-0 sm:border sm:border-[#233138] hover:border-[#38c7d0]/40 hover:shadow-md active:scale-[0.98] touch-manipulation"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '420px 560px' }}
    >
      <div
        data-product-card-gallery
        className="relative aspect-[4/5] overflow-hidden bg-[#0f1a1d]/5 select-none [touch-callout:none] [-webkit-touch-callout:none]"
        onTouchStart={gestures.onTouchStart}
        onTouchMove={gestures.onTouchMove}
        onTouchEnd={gestures.onTouchEnd}
        onContextMenu={gestures.onContextMenu}
        onClick={gestures.onClick}
        role="button"
        tabIndex={0}
        aria-label={product.name}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProduct();
          }
        }}
      >
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className={cn(
            'flex h-full w-full snap-x snap-mandatory overscroll-x-contain touch-pan-x no-scrollbar',
            images.length > 1 ? 'overflow-x-auto' : 'overflow-hidden',
          )}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {images.map((url, idx) => {
            const distance = Math.abs(idx - activeIndex);
            return (
              <div key={`${url}-${idx}`} className="relative h-full min-w-full shrink-0 snap-center snap-always bg-[#0f1a1d]/5">
                {distance <= 1 ? (
                  <div className="absolute inset-0">
                    <PresetImage
                      url={url}
                      preset={imagePreset}
                      priority={priority && idx === 0}
                      lazy={!(priority && idx === 0)}
                      alt={product.name}
                      draggable={false}
                      className={cn(
                        'object-contain object-center pointer-events-none',
                        isSold && 'opacity-60 grayscale',
                        isReserved && !isSold && 'opacity-90',
                      )}
                      onError={() => {
                        if (idx === activeIndex) setImageVisible(false);
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-full w-full bg-[#0f1a1d]/15" aria-hidden />
                )}
              </div>
            );
          })}
        </div>

        {images.length > 1 ? (
          <div className="pointer-events-none absolute bottom-1 right-1 flex gap-0.5">
            {images.slice(0, 5).map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  'h-1 w-1 rounded-full',
                  idx === activeIndex ? 'bg-[#e7edf0]' : 'bg-[#e7edf0]/50',
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
      </div>

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
          'absolute top-0.5 right-0.5 z-50 flex items-center gap-0.5 rounded-full bg-[#10181c]/95 backdrop-blur-sm hover:bg-[#162228] active:scale-90 transition-transform shadow-sm border border-[#2a3941]/80',
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
          isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'fill-transparent text-[#98aab1]',
        )}
        />
        {favoriteCount > 0 ? (
          <span className="text-[10px] font-semibold tabular-nums leading-none text-[#b1c0c6]">
            {favoriteCount}
          </span>
        ) : null}
      </button>

      <div className="px-1.5 pt-1 pb-1.5 sm:px-2 sm:pt-1.5 sm:pb-2 text-left space-y-0.5 sm:space-y-1">
        <Link href={`/products/${product.id}`} className="block">
          <div className="text-[15px] sm:text-base font-extrabold text-[#007782] tabular-nums leading-tight tracking-tight">
            {formatPrice(product.price)}
          </div>
          <p className="text-[11px] sm:text-xs text-[#9db0b8] leading-snug truncate">
            <span className="font-medium text-[#e6edf0]">{brandOrName}</span>
            <span className="text-[#5f747c] mx-0.5">·</span>
            <span className="text-[#a0b1b8]">{sizePart}</span>
          </p>
        </Link>
        {sellerName ? (
          <Link
            href={`/profile/${product.user_id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-[#9eb0b7] hover:text-[#38c7d0] truncate"
          >
            {product.sellerAvatarUrl ? (
              <PresetImage
                url={product.sellerAvatarUrl}
                preset="avatar"
                alt=""
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
          <p className="text-[10px] uppercase tracking-wide text-[#83979f] truncate leading-none">
            {categoryShort}
          </p>
        ) : null}
      </div>
    </div>
  );
}
