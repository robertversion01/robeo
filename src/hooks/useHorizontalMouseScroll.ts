'use client';

import { useEffect, useRef } from 'react';

/** Egér görgő + húzás → vízszintes scroll (touch marad natív). */
export function useHorizontalMouseScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta === 0) return;
      e.preventDefault();
      el.scrollLeft += delta;
    };

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('a, button, input, textarea, select, label')) return;
      dragging = true;
      startX = e.pageX;
      startScrollLeft = el.scrollLeft;
      el.classList.add('is-drag-scrolling');
    };

    const stopDrag = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-drag-scrolling');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      e.preventDefault();
      el.scrollLeft = startScrollLeft - (e.pageX - startX);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDrag);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
      el.classList.remove('is-drag-scrolling');
    };
  }, []);

  return ref;
}
