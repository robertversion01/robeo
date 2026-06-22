'use client';

import { memo, useCallback, useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { navigateWithViewTransition } from '@/lib/viewTransitionNavigate';
import { productViewTransitionName, shouldUseProductViewTransition } from '@/lib/productViewTransition';
import { Heart, MapPin, BadgeCheck, Star } from 'lucide-react';
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
import { feedPresetImageClass, IMAGE_VIEWPORT_PRELOAD_RADIUS, imageFromPreset } from '@/lib/imagePresets';
import { preloadPresetSrc } from '@/lib/preloadImage';
import Badge from '@/components/ui/Badge';
import { GALLERY_CAROUSEL_CLASS, GALLERY_SURFACE_CLASS } from '@/lib/galleryGestureConfig';
import type { ProductWithSeller } from '@/lib/sellerCardEnrichment';

interface ProductCardProps {
  product: ProductWithSeller;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  /** Above-the-fold kártya: azonnali (eager) + magas prioritású képbetöltés. */
  priority?: boolean;
  /** Főoldal vs browse feed képminőség */
  imagePreset?: ImagePresetName;
  /** Feed kártya — csak kép, ár, cím, 1 jelző */
  compact?: boolean;
}

export default memo(function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  priority = false,
  imagePreset = 'feedCard',
  compact = false,
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

  const productHref = `/products/${product.id}`;
  const heroTransitionName = productViewTransitionName(product.id);

  const openProduct = useCallback(() => {
    navigateWithViewTransition(router, productHref);
  }, [productHref, router]);

  const openViewer = useCallback(() => {
    if (images.length === 0) return;
    openFeedViewer({
      images,
      initialIndex: activeIndex,
      productName: product.name,
    });
  }, [images, activeIndex, product.name, openFeedViewer]);

  const preloadViewer = useCallback(() => {
    const url = images[activeIndex];
    if (!url) return;
    const resolved = imageFromPreset(url, 'pdpViewer', { priority: true });
    preloadPresetSrc(resolved.src, resolved.srcSet, 'high');
  }, [images, activeIndex]);

  useEffect(() => {
    if (images.length <= 1) return;
    for (let offset = -1; offset <= 1; offset += 1) {
      const idx = activeIndex + offset;
      if (idx < 0 || idx >= images.length) continue;
      const resolved = imageFromPreset(images[idx], imagePreset, {
        priority: priority && idx === 0,
      });
      preloadPresetSrc(
        resolved.src,
        resolved.srcSet,
        offset === 0 && priority ? 'high' : 'low',
      );
    }
  }, [activeIndex, images, imagePreset, priority]);

  const gestures = useImageGalleryGestures({
    onTap: openProduct,
    onOpenViewer: openViewer,
    onPreloadViewer: preloadViewer,
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
  const sellerAvgRating =
    product.sellerAvgRating != null && product.sellerReviewCount != null && product.sellerReviewCount > 0
      ? product.sellerAvgRating
      : null;
  const sellerReviewCount = product.sellerReviewCount ?? 0;

  /** Max 1 kép-overlay badge: sold/reserved teljes, egyébként featured > age */
  const statusOverlay = isSold
    ? ('sold' as const)
    : isReserved
      ? ('reserved' as const)
      : isFeatured
        ? ('featured' as const)
        : ageBadge
          ? ('age' as const)
          : null;

  const showCompactTrust =
    compact &&
    (sellerAvgRating != null || product.sellerVerified);

  return (
    <div
      className={cn(
        'group relative overflow-hidden',
        compact
          ? 'product-feed-card rounded-none bg-transparent'
          : 'card-base rounded-lg sm:rounded-xl border-0 sm:border sm:border-[#233138] hover:border-[#38c7d0]/40 hover:shadow-md',
      )}
      style={{ contentVisibility: 'auto', containIntrinsicSize: compact ? '280px 380px' : '420px 560px' }}
    >
      <div
        data-product-card-gallery
        className={cn(
          GALLERY_SURFACE_CLASS,
          'relative aspect-[4/5] overflow-hidden select-none',
          compact ? 'bg-[#11171a]' : 'bg-[#121a1e]',
        )}
        style={
          shouldUseProductViewTransition()
            ? ({ viewTransitionName: heroTransitionName } as CSSProperties)
            : undefined
        }
        onContextMenu={gestures.onContextMenu}
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
          onTouchStart={gestures.onTouchStart}
          onTouchMove={gestures.onTouchMove}
          onTouchEnd={gestures.onTouchEnd}
          onClick={gestures.onClick}
          className={cn(
            GALLERY_CAROUSEL_CLASS,
            images.length > 1 ? 'overflow-x-auto' : 'overflow-hidden',
          )}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {images.map((url, idx) => {
            const distance = Math.abs(idx - activeIndex);
            const inBand = distance <= IMAGE_VIEWPORT_PRELOAD_RADIUS;
            return (
              <div key={`${product.id}-slide-${idx}`} className={cn('relative h-full min-w-full shrink-0 snap-center snap-always snap-stop-always', compact ? 'bg-[#11171a]' : 'bg-[#121a1e]')}>
                {inBand ? (
                  <div className="absolute inset-0">
                    <PresetImage
                      url={url}
                      preset={imagePreset}
                      priority={priority && idx === 0}
                      lazy={!(priority && idx === 0)}
                      alt={product.name}
                      draggable={false}
                      className={cn(
                        feedPresetImageClass(imagePreset),
                        'pointer-events-none',
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
          <div
            className={cn(
              'pointer-events-none absolute flex gap-px',
              compact ? 'bottom-0.5 right-0.5' : 'bottom-1 right-1 gap-0.5',
            )}
          >
            {images.slice(0, 5).map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  'rounded-full',
                  compact ? 'h-0.5 w-0.5' : 'h-1 w-1',
                  idx === activeIndex ? 'bg-[#e7edf0]' : 'bg-[#e7edf0]/50',
                )}
              />
            ))}
          </div>
        ) : null}
        {statusOverlay === 'sold' ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="rounded-sm bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {t('product.sold')}
            </span>
          </div>
        ) : statusOverlay === 'reserved' ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="rounded-sm bg-amber-600/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {t('product.reserved')}
            </span>
          </div>
        ) : statusOverlay === 'age' ? (
          <span className="pointer-events-none absolute top-0.5 left-0.5 rounded-sm bg-black/50 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-white">
            {ageBadge === 'just_now' ? t('product.badgeJustNow') : t('product.badgeNew')}
          </span>
        ) : statusOverlay === 'featured' ? (
          compact ? (
            <span className="pointer-events-none absolute top-0.5 left-0.5 rounded-sm bg-black/55 px-1 py-px text-[9px] font-medium text-white">
              {t('product.featured')}
            </span>
          ) : (
            <Badge variant="featured" className="pointer-events-none absolute top-1 left-1 text-[9px] px-1 py-0.5">
              {t('product.featured')}
            </Badge>
          )
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
          'absolute z-50 flex items-center gap-0.5 rounded-full active:scale-90',
          compact
            ? cn(
                'top-0.5 right-0.5 bg-black/25 hover:bg-black/35 border-0',
                favoriteCount > 0 ? 'h-6 min-w-[1.5rem] px-1' : 'h-6 w-6 justify-center',
              )
            : cn(
                'top-0.5 right-0.5 bg-[#10181c] hover:bg-[#162228] shadow-sm border border-[#2a3941]/80',
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
          size={compact ? 12 : 14}
          className={cn(
          'shrink-0 transition-all duration-200',
          heartBump && 'scale-125',
          isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'fill-transparent text-[#98aab1]',
        )}
        />
        {favoriteCount > 0 ? (
          <span className={cn('font-semibold tabular-nums leading-none text-[#b1c0c6]', compact ? 'text-[9px]' : 'text-[10px]')}>
            {favoriteCount}
          </span>
        ) : null}
      </button>

      <div
        className={cn(
          'text-left',
          compact ? 'px-0 pt-0.5 pb-0 space-y-0' : 'px-1.5 pt-1 pb-1.5 sm:px-2 sm:pt-1.5 sm:pb-2 space-y-0.5 sm:space-y-1',
        )}
      >
        <Link
          href={productHref}
          className="block"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            navigateWithViewTransition(router, productHref);
          }}
        >
          <div
            className={cn(
              'font-bold text-[#007782] tabular-nums tracking-tight',
              compact ? 'text-sm leading-tight' : 'text-[15px] font-extrabold leading-none',
            )}
          >
            {formatPrice(product.price)}
          </div>
          <p className={cn('text-[#9db0b8] leading-tight truncate', compact ? 'text-[11px] mt-px' : 'text-[11px] leading-snug mt-0.5')}>
            <span className="font-medium text-[#e6edf0]">{brandOrName}</span>
            <span className="text-[#5f747c] mx-0.5">·</span>
            <span className="text-[#a0b1b8]">{sizePart}</span>
          </p>
        </Link>
        {!compact && sellerName ? (
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
        {showCompactTrust ? (
          <p className="flex items-center gap-0.5 text-[9px] leading-none text-[#83979f] truncate mt-px">
            {sellerAvgRating != null ? (
              <>
                <Star size={9} className="shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                <span className="font-semibold tabular-nums text-[#c5d0d5]">
                  {sellerAvgRating.toFixed(1)}
                </span>
                {sellerReviewCount > 0 ? (
                  <span className="text-[#6d828a]">({sellerReviewCount})</span>
                ) : null}
              </>
            ) : product.sellerVerified ? (
              <>
                <BadgeCheck size={10} className="shrink-0 text-[#007782]" aria-hidden />
                <span>{t('sellerTrust.verified')}</span>
              </>
            ) : null}
          </p>
        ) : null}
        {!compact && districtLabel ? (
          <p className="flex items-center gap-0.5 text-[10px] font-medium text-[#007782] truncate leading-none">
            <MapPin size={10} className="shrink-0" aria-hidden />
            {districtLabel}
          </p>
        ) : !compact && categoryShort ? (
          <p className="text-[10px] uppercase tracking-wide text-[#83979f] truncate leading-none">
            {categoryShort}
          </p>
        ) : null}
      </div>
    </div>
  );
});
