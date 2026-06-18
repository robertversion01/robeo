'use client';

import { useCallback, useRef } from 'react';

const LONG_PRESS_MS = 450;
const LONG_PRESS_JITTER_PX = 10;
const CAROUSEL_CANCEL_DX = 14;

type Options = {
  onTap: () => void;
  onOpenViewer: () => void;
  enabled?: boolean;
};

/**
 * Tap → navigáció; long-press → fullscreen viewer (nem böngésző menü).
 * Horizontális swipe carousel közben long-press nem indul.
 */
export function useImageGalleryGestures({ onTap, onOpenViewer, enabled = true }: Options) {
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    moved: false,
    longPressFired: false,
    suppressTap: false,
    carouselSwipe: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const t = e.touches[0];
      if (!t) return;
      gestureRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        moved: false,
        longPressFired: false,
        suppressTap: false,
        carouselSwipe: false,
      };
      clearTimer();
      timerRef.current = setTimeout(() => {
        const g = gestureRef.current;
        if (g.moved || g.carouselSwipe) return;
        g.longPressFired = true;
        g.suppressTap = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(12);
        }
        onOpenViewer();
      }, LONG_PRESS_MS);
    },
    [clearTimer, enabled, onOpenViewer],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - gestureRef.current.startX;
      const dy = t.clientY - gestureRef.current.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > CAROUSEL_CANCEL_DX && absDx > absDy) {
        gestureRef.current.carouselSwipe = true;
        gestureRef.current.moved = true;
        clearTimer();
        return;
      }

      if (absDy > LONG_PRESS_JITTER_PX || Math.hypot(dx, dy) > LONG_PRESS_JITTER_PX * 1.4) {
        gestureRef.current.moved = true;
        clearTimer();
      }
    },
    [clearTimer, enabled],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      clearTimer();
      const g = gestureRef.current;
      if (!enabled) return;
      if (g.longPressFired) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (g.carouselSwipe || g.moved || g.suppressTap) return;
      onTap();
    },
    [clearTimer, enabled, onTap],
  );

  const onContextMenu = useCallback(
    (e: React.SyntheticEvent) => {
      if (!enabled) return;
      e.preventDefault();
      e.stopPropagation();
      onOpenViewer();
    },
    [enabled, onOpenViewer],
  );

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      const g = gestureRef.current;
      if (g.moved || g.longPressFired || g.carouselSwipe) {
        e.preventDefault();
        return;
      }
      onTap();
    },
    [enabled, onTap],
  );

  return { onTouchStart, onTouchMove, onTouchEnd, onContextMenu, onClick };
}
