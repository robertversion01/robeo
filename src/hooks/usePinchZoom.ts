'use client';

import { useCallback, useRef, useState, type TouchEvent } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 3;

type Point = { x: number; y: number };

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Dupla tap + pinch zoom egy aktív slide-on. */
export function usePinchZoom(enabled: boolean) {
  const [scale, setScale] = useState(1);
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);
  const lastTapRef = useRef(0);

  const reset = useCallback(() => {
    setScale(1);
    pinchStartRef.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      if (!enabled) return;
      if (e.touches.length === 2) {
        const a = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const b = { x: e.touches[1].clientX, y: e.touches[1].clientY };
        pinchStartRef.current = { dist: distance(a, b), scale };
      }
    },
    [enabled, scale],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      if (!enabled || e.touches.length !== 2 || !pinchStartRef.current) return;
      const a = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const b = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const dist = distance(a, b);
      const next = pinchStartRef.current.scale * (dist / pinchStartRef.current.dist);
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)));
      if (e.cancelable) e.preventDefault();
    },
    [enabled],
  );

  const onTouchEnd = useCallback(() => {
    pinchStartRef.current = null;
    if (scale < 1.15) setScale(1);
  }, [scale]);

  const onDoubleTap = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      setScale((s) => (s > 1.15 ? 1 : 2.5));
    }
    lastTapRef.current = now;
  }, [enabled]);

  return {
    scale,
    isZoomed: scale > 1.15,
    reset,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
    onDoubleTap,
  };
}
