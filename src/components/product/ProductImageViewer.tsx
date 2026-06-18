'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import PresetImage from '@/components/product/PresetImage';
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
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const safe = Math.min(Math.max(0, initialIndex), images.length - 1);
    setActiveIndex(safe);
    setIsZoomed(false);
    requestAnimationFrame(() => {
      const el = carouselRef.current;
      if (el && el.clientWidth > 0) {
        el.scrollLeft = el.clientWidth * safe;
      }
    });
  }, [open, initialIndex, images.length]);

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

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget;
      if (el.clientWidth <= 0) return;
      const next = Math.round(el.scrollLeft / el.clientWidth);
      if (next !== activeIndex && next >= 0 && next < images.length) {
        setActiveIndex(next);
        setIsZoomed(false);
      }
    },
    [activeIndex, images.length],
  );

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setIsZoomed((z) => !z);
    }
    lastTapRef.current = now;
  }, []);

  if (!open || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('product.imageViewer')}
    >
      <header className="relative z-10 flex items-center justify-between px-3 py-3 safe-area-top">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label={t('product.closeViewer')}
        >
          <X size={22} />
        </button>
        <span className="text-sm font-medium text-white/80 tabular-nums">
          {t('product.imageCounter', { current: activeIndex + 1, total: images.length })}
        </span>
        <button
          type="button"
          onClick={() => setIsZoomed((z) => !z)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label={isZoomed ? t('product.zoomOut') : t('product.zoomIn')}
        >
          {isZoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
        </button>
      </header>

      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="relative flex flex-1 w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {images.map((imgUrl, idx) => {
          const distance = Math.abs(idx - activeIndex);
          const isActive = idx === activeIndex;
          return (
            <div
              key={`${imgUrl}-${idx}`}
              className="flex h-full min-w-full snap-center items-center justify-center px-1"
              onClick={handleDoubleTap}
            >
              {distance <= 1 ? (
                <PresetImage
                  url={imgUrl}
                  preset="pdpViewer"
                  priority={isActive}
                  lazy={!isActive}
                  alt={productName}
                  className={cn(
                    'max-h-full max-w-full object-contain transition-transform duration-200 ease-out',
                    isActive && isZoomed ? 'scale-[2] cursor-zoom-out' : 'scale-100 cursor-zoom-in',
                  )}
                />
              ) : (
                <div className="h-[60vh] w-full max-w-sm rounded-lg bg-white/5" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
