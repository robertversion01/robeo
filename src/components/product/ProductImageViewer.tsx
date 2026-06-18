'use client';

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import PresetImage from '@/components/product/PresetImage';
import { useSnapCarousel } from '@/hooks/useSnapCarousel';
import { usePinchZoom } from '@/hooks/usePinchZoom';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { IMAGE_VIEWPORT_PRELOAD_RADIUS } from '@/lib/imagePresets';
import { cn } from '@/lib/utils';

type ProductImageViewerProps = {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  productName?: string;
};

export default function ProductImageViewer({
  images,
  initialIndex = 0,
  open,
  onClose,
  productName = '',
}: ProductImageViewerProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const { scale, isZoomed, reset, handlers, onDoubleTap } = usePinchZoom(open);

  useBodyScrollLock(open);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const blockContextMenu = useCallback((e: SyntheticEvent) => {
    e.preventDefault();
  }, []);

  if (!open || images.length === 0 || !mounted) return null;

  const content = (
    <div
      data-feed-image-viewer
      data-no-feed-swipe
      className="product-gallery-overlay fixed inset-0 z-[99999] flex h-[100dvh] w-full flex-col bg-black select-none"
      role="dialog"
      aria-modal="true"
      aria-label={t('product.imageViewer')}
      onContextMenu={blockContextMenu}
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
          'relative min-h-0 w-full flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-none no-scrollbar',
          isZoomed ? 'overflow-hidden touch-none' : 'touch-pan-x [touch-action:pan-x]',
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
                  className="flex h-full w-full max-h-full items-center justify-center overflow-hidden px-2 pb-8 pt-12"
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
                    className="block max-h-full max-w-full object-contain pointer-events-none"
                    style={
                      isActive && isZoomed
                        ? {
                            transform: `scale(${scale})`,
                            transformOrigin: 'center center',
                          }
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="h-full w-full" aria-hidden />
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
