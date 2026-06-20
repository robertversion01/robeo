'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SCROLL_SETTLE_MS = 32;
/** Szigorúbb commit — véletlen fling ne lapozzon. */
const SWIPE_COMMIT_RATIO = 0.28;
const SWIPE_COMMIT_MIN_PX = 52;
const AXIS_DECIDE_PX = 14;
const HORIZONTAL_DOMINANCE = 1.35;
const HORIZONTAL_LOCK_PX = 32;

type Options = {
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
};

type TouchMode = 'idle' | 'pending' | 'vertical' | 'horizontal';

/**
 * Egy gesztus = max ±1 slide.
 * Függőleges scroll elsőbbség — horizontál csak domináns vízszintes mozdulatnál.
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
      }, smooth ? 120 : 0);
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

      const commitThreshold = Math.max(SWIPE_COMMIT_MIN_PX, w * SWIPE_COMMIT_RATIO);
      if (typeof touchDeltaX === 'number' && Math.abs(touchDeltaX) >= commitThreshold) {
        next = clampIndex(anchorIndex + (touchDeltaX < 0 ? 1 : -1));
      } else {
        const raw = Math.round(el.scrollLeft / w);
        next = clampToGestureWindow(raw, anchorIndex);
      }

      if (next !== Math.round(el.scrollLeft / w) || el.scrollLeft !== next * w) {
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

    let mode: TouchMode = 'idle';
    let startX = 0;
    let startY = 0;
    let anchor = settledRef.current;

    const clearHorizontalLock = () => {
      delete el.dataset.horizontalLock;
    };

    const onTouchStart = (e: TouchEvent) => {
      mode = 'pending';
      anchor = settledRef.current;
      touchAnchorRef.current = anchor;
      startX = e.touches[0]?.clientX ?? 0;
      startY = e.touches[0]?.clientY ?? 0;
      touchStartXRef.current = startX;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (mode === 'idle' || mode === 'vertical') return;

      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (mode === 'pending') {
        if (absDx < AXIS_DECIDE_PX && absDy < AXIS_DECIDE_PX) return;
        if (absDy > absDx * HORIZONTAL_DOMINANCE) {
          mode = 'vertical';
          return;
        }
        if (absDx > absDy * HORIZONTAL_DOMINANCE && absDx >= HORIZONTAL_LOCK_PX) {
          mode = 'horizontal';
          el.dataset.horizontalLock = 'true';
        } else {
          return;
        }
      }

      if (mode === 'horizontal') {
        const w = el.clientWidth;
        if (w <= 0) return;
        const min = Math.max(0, anchor - 1) * w;
        const max = Math.min(itemCount - 1, anchor + 1) * w;
        const target = anchor * w - dx;
        el.scrollLeft = Math.max(min, Math.min(max, target));
        if (e.cancelable) e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (mode === 'horizontal') {
        const endX = e.changedTouches[0]?.clientX ?? startX;
        const dx = endX - startX;
        requestAnimationFrame(() => settleScroll(anchor, dx));
        clearHorizontalLock();
      }
      mode = 'idle';
    };

    const onTouchCancel = () => {
      clearHorizontalLock();
      mode = 'idle';
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
      clearHorizontalLock();
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
