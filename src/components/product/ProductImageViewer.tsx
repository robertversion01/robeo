'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import PresetImage from '@/components/product/PresetImage';
import { useSnapCarousel } from '@/hooks/useSnapCarousel';
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
  const [isZoomed, setIsZoomed] = useState(false);
  const lastTapRef = useRef(0);

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
    setIsZoomed(false);
    requestAnimationFrame(() => scrollToIndex(safe, false));
  }, [open, initialIndex, images.length, scrollToIndex]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
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

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setIsZoomed((z) => !z);
    }
    lastTapRef.current = now;
  }, []);

  if (!open || images.length === 0 || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black select-none touch-none [touch-callout:none] [-webkit-touch-callout:none]"
      role="dialog"
      aria-modal="true"
      aria-label={t('product.imageViewer')}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Vinted-szerű bezárás — jobb felső */}
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
        className="relative flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {images.map((imgUrl, idx) => {
          const distance = Math.abs(idx - activeIndex);
          const isActive = idx === activeIndex;
          return (
            <div
              key={`${imgUrl}-${idx}`}
              className="flex h-full min-w-full shrink-0 snap-center snap-always items-center justify-center px-2"
              onClick={handleDoubleTap}
            >
              {distance <= 1 ? (
                <PresetImage
                  url={imgUrl}
                  preset="pdpViewer"
                  priority={isActive}
                  lazy={!isActive}
                  alt={productName}
                  draggable={false}
                  className={cn(
                    'max-h-[85vh] max-w-full object-contain transition-transform duration-200 ease-out pointer-events-none',
                    isActive && isZoomed ? 'scale-[2]' : 'scale-100',
                  )}
                />
              ) : (
                <div className="h-[60vh] w-full" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      {/* Lapozó pöttyök — alul középen, mint Vinted */}
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
