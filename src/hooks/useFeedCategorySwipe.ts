'use client';

import { useCallback, useMemo, useRef, type TouchEvent } from 'react';

type Category = { id: string };

type Options = {
  enabled: boolean;
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
};

const MOVE_DECIDE_PX = 12;
const SWIPE_MIN_PX = 56;
const HORIZONTAL_DOMINANCE = 1.25;
const SWIPE_COOLDOWN_MS = 350;

function isNoSwipeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (document.body.dataset.feedViewerOpen === 'true') return true;
  return Boolean(
    target.closest(
      'input, textarea, select, [data-no-feed-swipe], [data-feed-image-viewer], [data-product-card-gallery]',
    ),
  );
}

type Track = {
  startX: number;
  startY: number;
  identifier: number;
  decided: boolean;
  horizontal: boolean;
};

export function useFeedCategorySwipe({
  enabled,
  categories,
  selectedCategory,
  onCategoryChange,
}: Options) {
  const trackRef = useRef<Track | null>(null);
  const lastSwipeAtRef = useRef(0);

  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories]);

  const goRelative = useCallback(
    (delta: -1 | 1) => {
      const idx = categoryIds.indexOf(selectedCategory);
      if (idx < 0) return;
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= categoryIds.length) return;
      if (Date.now() - lastSwipeAtRef.current < SWIPE_COOLDOWN_MS) return;
      lastSwipeAtRef.current = Date.now();
      onCategoryChange(categoryIds[nextIdx]);
    },
    [categoryIds, onCategoryChange, selectedCategory],
  );

  const reset = useCallback(() => {
    trackRef.current = null;
  }, []);

  const onTouchStart = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!enabled || event.touches.length !== 1) return;
      if (isNoSwipeTarget(event.target)) return;

      const touch = event.touches[0];
      trackRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        identifier: touch.identifier,
        decided: false,
        horizontal: false,
      };
    },
    [enabled],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const track = trackRef.current;
      if (!enabled || !track) return;

      const touch = Array.from(event.touches).find((t) => t.identifier === track.identifier);
      if (!touch) return;

      const dx = touch.clientX - track.startX;
      const dy = touch.clientY - track.startY;

      if (track.decided) return;
      if (Math.abs(dx) < MOVE_DECIDE_PX && Math.abs(dy) < MOVE_DECIDE_PX) return;

      track.decided = true;
      track.horizontal = Math.abs(dx) > Math.abs(dy) * HORIZONTAL_DOMINANCE;
    },
    [enabled],
  );

  const finishSwipe = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const track = trackRef.current;
      if (!enabled || !track) return;

      const touch = Array.from(event.changedTouches).find((t) => t.identifier === track.identifier);
      if (!touch) {
        reset();
        return;
      }

      const dx = touch.clientX - track.startX;
      const dy = touch.clientY - track.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      const horizontal =
        track.decided && track.horizontal && absDx >= SWIPE_MIN_PX && absDx > absDy * HORIZONTAL_DOMINANCE;

      if (horizontal) {
        if (dx < 0) goRelative(1);
        else goRelative(-1);
      }

      reset();
    },
    [enabled, goRelative, reset],
  );

  return {
    swipeHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd: finishSwipe,
      onTouchCancel: reset,
    },
  };
}
