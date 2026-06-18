'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SCROLL_SETTLE_MS = 120;

type Options = {
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
};

/**
 * Egy gesztus = max ±1 slide. Scroll végén snap + lock, hogy fling ne ugorjon át több képen.
 */
export function useSnapCarousel(itemCount: number, options: Options = {}) {
  const initial = options.initialIndex ?? 0;
  const ref = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(initial);
  const settledRef = useRef(initial);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticRef = useRef(false);

  const clampIndex = useCallback(
    (i: number) => Math.max(0, Math.min(Math.max(itemCount - 1, 0), i)),
    [itemCount],
  );

  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      const el = ref.current;
      if (!el || el.clientWidth <= 0 || itemCount <= 0) return;
      const next = clampIndex(index);
      programmaticRef.current = true;
      el.scrollTo({ left: next * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
      settledRef.current = next;
      setActiveIndex(next);
      options.onIndexChange?.(next);
      window.setTimeout(() => {
        programmaticRef.current = false;
      }, smooth ? 320 : 0);
    },
    [clampIndex, itemCount, options],
  );

  const settleScroll = useCallback(() => {
    const el = ref.current;
    if (!el || el.clientWidth <= 0 || itemCount <= 0) return;
    const raw = Math.round(el.scrollLeft / el.clientWidth);
    const last = settledRef.current;
    let next = raw;
    if (next > last + 1) next = last + 1;
    if (next < last - 1) next = last - 1;
    next = clampIndex(next);
    if (next !== raw) {
      programmaticRef.current = true;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
      window.setTimeout(() => {
        programmaticRef.current = false;
      }, 320);
    }
    if (next !== settledRef.current) {
      settledRef.current = next;
      setActiveIndex(next);
      options.onIndexChange?.(next);
    }
  }, [clampIndex, itemCount, options]);

  const handleScroll = useCallback(() => {
    if (programmaticRef.current) return;
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(settleScroll, SCROLL_SETTLE_MS);
  }, [settleScroll]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    settledRef.current = clampIndex(initial);
    setActiveIndex(clampIndex(initial));
  }, [initial, clampIndex]);

  return { ref, activeIndex, scrollToIndex, handleScroll, settledRef };
}
