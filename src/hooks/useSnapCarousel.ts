'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SCROLL_SETTLE_MS = 60;
const SWIPE_COMMIT_RATIO = 0.22;

type Options = {
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
};

/**
 * Egy gesztus = max ±1 slide.
 * Touchmove közben scroll clamp + touch végén irány alapú commit.
 */
export function useSnapCarousel(itemCount: number, options: Options = {}) {
  const initial = options.initialIndex ?? 0;
  const ref = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(initial);
  const settledRef = useRef(initial);
  const touchAnchorRef = useRef(initial);
  const touchStartXRef = useRef(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const clampIndex = useCallback(
    (i: number) => Math.max(0, Math.min(Math.max(itemCount - 1, 0), i)),
    [itemCount],
  );

  const applyIndex = useCallback(
    (next: number, smooth: boolean) => {
      const el = ref.current;
      if (!el || el.clientWidth <= 0) return;
      const clamped = clampIndex(next);
      programmaticRef.current = true;
      el.scrollTo({ left: clamped * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
      settledRef.current = clamped;
      setActiveIndex(clamped);
      optionsRef.current.onIndexChange?.(clamped);
      window.setTimeout(() => {
        programmaticRef.current = false;
      }, smooth ? 280 : 0);
    },
    [clampIndex],
  );

  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (itemCount <= 0) return;
      applyIndex(index, smooth);
    },
    [applyIndex, itemCount],
  );

  const clampToGestureWindow = useCallback(
    (rawIndex: number, anchorIndex: number) => {
      let next = rawIndex;
      if (next > anchorIndex + 1) next = anchorIndex + 1;
      if (next < anchorIndex - 1) next = anchorIndex - 1;
      return clampIndex(next);
    },
    [clampIndex],
  );

  const settleScroll = useCallback(
    (anchorIndex = settledRef.current, touchDeltaX?: number) => {
      const el = ref.current;
      if (!el || el.clientWidth <= 0 || itemCount <= 0) return;

      const w = el.clientWidth;
      let next: number;

      if (typeof touchDeltaX === 'number' && Math.abs(touchDeltaX) >= w * SWIPE_COMMIT_RATIO) {
        next = clampIndex(anchorIndex + (touchDeltaX < 0 ? 1 : -1));
      } else {
        const raw = Math.round(el.scrollLeft / w);
        next = clampToGestureWindow(raw, anchorIndex);
      }

      if (next !== Math.round(el.scrollLeft / w)) {
        applyIndex(next, true);
        return;
      }
      if (el.scrollLeft !== next * w) {
        applyIndex(next, false);
        return;
      }
      if (next !== settledRef.current) {
        settledRef.current = next;
        setActiveIndex(next);
        optionsRef.current.onIndexChange?.(next);
      }
    },
    [applyIndex, clampIndex, clampToGestureWindow, itemCount],
  );

  const handleScroll = useCallback(() => {
    if (programmaticRef.current) return;
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => settleScroll(), SCROLL_SETTLE_MS);
  }, [settleScroll]);

  useEffect(() => {
    const el = ref.current;
    if (!el || itemCount <= 1) return;

    const onTouchStart = (e: TouchEvent) => {
      touchAnchorRef.current = settledRef.current;
      touchStartXRef.current = e.touches[0]?.clientX ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const anchor = touchAnchorRef.current;
      const min = Math.max(0, anchor - 1) * w;
      const max = Math.min(itemCount - 1, anchor + 1) * w;
      if (el.scrollLeft < min - 1) {
        el.scrollLeft = min;
        if (e.cancelable) e.preventDefault();
      } else if (el.scrollLeft > max + 1) {
        el.scrollLeft = max;
        if (e.cancelable) e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
      const dx = endX - touchStartXRef.current;
      requestAnimationFrame(() => settleScroll(touchAnchorRef.current, dx));
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [itemCount, settleScroll]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    settledRef.current = clampIndex(initial);
    setActiveIndex(clampIndex(initial));
  }, [initial, clampIndex]);

  return {
    ref,
    activeIndex,
    scrollToIndex,
    handleScroll,
    settledRef,
  };
}
