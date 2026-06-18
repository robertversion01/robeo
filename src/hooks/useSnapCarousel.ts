'use client';

import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';

const SCROLL_SETTLE_MS = 80;

type Options = {
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
};

/**
 * Egy gesztus = max ±1 slide. Touch végén azonnali clamp + scroll settle backup.
 */
export function useSnapCarousel(itemCount: number, options: Options = {}) {
  const initial = options.initialIndex ?? 0;
  const ref = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(initial);
  const settledRef = useRef(initial);
  const touchStartIndexRef = useRef(initial);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticRef = useRef(false);

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
      options.onIndexChange?.(clamped);
      window.setTimeout(() => {
        programmaticRef.current = false;
      }, smooth ? 300 : 0);
    },
    [clampIndex, options],
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
    (anchorIndex = settledRef.current) => {
      const el = ref.current;
      if (!el || el.clientWidth <= 0 || itemCount <= 0) return;
      const raw = Math.round(el.scrollLeft / el.clientWidth);
      const next = clampToGestureWindow(raw, anchorIndex);
      if (next !== raw) {
        applyIndex(next, true);
        return;
      }
      if (next !== settledRef.current) {
        settledRef.current = next;
        setActiveIndex(next);
        options.onIndexChange?.(next);
      }
    },
    [applyIndex, clampToGestureWindow, itemCount, options],
  );

  const handleScroll = useCallback(() => {
    if (programmaticRef.current) return;
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => settleScroll(), SCROLL_SETTLE_MS);
  }, [settleScroll]);

  const onTouchStart = useCallback(() => {
    touchStartIndexRef.current = settledRef.current;
  }, []);

  const onTouchEnd = useCallback(() => {
    window.requestAnimationFrame(() => settleScroll(touchStartIndexRef.current));
  }, [settleScroll]);

  const carouselTouchHandlers = {
    onTouchStart,
    onTouchEnd: (e: TouchEvent<HTMLElement>) => {
      onTouchEnd();
      void e;
    },
  };

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
    carouselTouchHandlers,
    settledRef,
  };
}
