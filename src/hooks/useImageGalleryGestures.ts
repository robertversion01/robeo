'use client';

import { useCallback, useRef } from 'react';

const LONG_PRESS_MS = 380;
const MOVE_CANCEL_PX = 12;

type Options = {
  onTap: () => void;
  onOpenViewer: () => void;
  enabled?: boolean;
};

/**
 * Rövid tap → navigáció; long-press / contextmenu → fullscreen viewer.
 * Swipe közben nem nyit navigációt (a carousel kezeli).
 */
export function useImageGalleryGestures({ onTap, onOpenViewer, enabled = true }: Options) {
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    moved: false,
    longPressFired: false,
    suppressTap: false,
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
      };
      clearTimer();
      timerRef.current = setTimeout(() => {
        gestureRef.current.longPressFired = true;
        gestureRef.current.suppressTap = true;
        gestureRef.current.moved = true;
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
      const dx = Math.abs(t.clientX - gestureRef.current.startX);
      const dy = Math.abs(t.clientY - gestureRef.current.startY);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
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
      if (g.longPressFired) return;
      const t = e.changedTouches[0];
      if (t) {
        const dx = Math.abs(t.clientX - g.startX);
        const dy = Math.abs(t.clientY - g.startY);
        if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
          g.moved = true;
        }
      }
      if (g.moved || g.suppressTap) return;
      onTap();
    },
    [clearTimer, enabled, onTap],
  );

  const onContextMenu = useCallback(
    (e: React.SyntheticEvent) => {
      if (!enabled) return;
      e.preventDefault();
      onOpenViewer();
    },
    [enabled, onOpenViewer],
  );

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      if (gestureRef.current.moved || gestureRef.current.longPressFired) {
        e.preventDefault();
        return;
      }
      onTap();
    },
    [enabled, onTap],
  );

  return { onTouchStart, onTouchMove, onTouchEnd, onContextMenu, onClick };
}
