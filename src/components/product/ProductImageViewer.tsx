'use client';

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import PresetImage from '@/components/product/PresetImage';
import { useSnapCarousel } from '@/hooks/useSnapCarousel';
import { usePinchZoom } from '@/hooks/usePinchZoom';
import { IMAGE_VIEWPORT_PRELOAD_RADIUS } from '@/lib/imagePresets';
import { cn } from '@/lib/utils';

type ProductImageViewerProps = {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  productName?: string;
};

function lockBodyScroll() {
  const scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  return scrollY;
}

function unlockBodyScroll(scrollY: number) {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  window.scrollTo(0, scrollY);
}

export default function ProductImageViewer({
  images,
  initialIndex = 0,
  open,
  onClose,
  productName = '',
}: ProductImageViewerProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const scrollLockY = useRef(0);
  const { scale, isZoomed, reset, handlers, onDoubleTap } = usePinchZoom(open);

  const { ref: carouselRef, activeIndex, scrollToIndex, handleScroll } = useSnapCarousel(
    images.length,
    { initialIndex },
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const safe = Math.min(Math.max(0, initialIndex), images.length - 1);
    reset();
    requestAnimationFrame(() => scrollToIndex(safe, false));
  }, [open, initialIndex, images.length, scrollToIndex, reset]);

  useEffect(() => {
    reset();
  }, [activeIndex, reset]);

  useEffect(() => {
    if (!open) return;
    scrollLockY.current = lockBodyScroll();
    document.body.dataset.feedViewerOpen = 'true';
    return () => {
      delete document.body.dataset.feedViewerOpen;
      unlockBodyScroll(scrollLockY.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const stopBubble = useCallback((e: SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  if (!open || images.length === 0 || !mounted) return null;

  const content = (
    <div
      data-feed-image-viewer
      data-no-feed-swipe
      className="product-gallery-overlay fixed inset-0 z-[99999] flex flex-col bg-black select-none"
      role="dialog"
      aria-modal="true"
      aria-label={t('product.imageViewer')}
      onContextMenu={(e) => e.preventDefault()}
      onTouchStart={stopBubble}
      onTouchMove={stopBubble}
      onTouchEnd={stopBubble}
      onTouchCancel={stopBubble}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto rounded-full border border-white/90 px-4 py-1.5 text-sm font-semibold text-white"
        >
          {t('product.closeViewer')}
        </button>
      </div>

      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className={cn(
          'relative flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-none no-scrollbar',
          isZoomed ? 'touch-none overflow-hidden' : 'touch-pan-x [touch-action:pan-x]',
        )}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {images.map((imgUrl, idx) => {
          const isActive = idx === activeIndex;
          const inBand = Math.abs(idx - activeIndex) <= IMAGE_VIEWPORT_PRELOAD_RADIUS;
          return (
            <div
              key={`${imgUrl}-${idx}`}
              className="flex h-full min-w-full shrink-0 snap-center snap-always snap-stop-always items-center justify-center"
            >
              {inBand ? (
                <div
                  className="flex h-full w-full items-center justify-center px-1"
                  onClick={isActive ? onDoubleTap : undefined}
                  {...(isActive ? handlers : {})}
                >
                  <PresetImage
                    url={imgUrl}
                    preset="pdpViewer"
                    priority={isActive}
                    lazy={!isActive}
                    alt={productName}
                    draggable={false}
                    className={cn(
                      'max-h-[92vh] w-full object-contain transition-transform duration-150 ease-out pointer-events-none',
                      isActive && isZoomed ? 'h-[92vh]' : 'h-full',
                    )}
                    style={
                      isActive
                        ? {
                            transform: `scale(${scale})`,
                            transformOrigin: 'center center',
                          }
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="h-[60vh] w-full" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      {images.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center gap-1.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors',
                idx === activeIndex ? 'bg-white' : 'bg-white/35',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );

  return createPortal(content, document.body);
}
