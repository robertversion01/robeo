'use client';

import { useEffect, useRef } from 'react';

const LOCK_CLASS = 'feed-viewer-scroll-lock';

/**
 * iOS-kompatibilis scroll lock — bezáráskor garantált visszaállítás.
 */
export function useBodyScrollLock(locked: boolean) {
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!locked) return;

    scrollYRef.current = window.scrollY;
    const y = scrollYRef.current;
    const body = document.body;
    const html = document.documentElement;

    body.classList.add(LOCK_CLASS);
    body.style.top = `-${y}px`;
    body.dataset.feedViewerOpen = 'true';
    html.style.overflow = 'hidden';

    return () => {
      const restoreY = scrollYRef.current;
      body.classList.remove(LOCK_CLASS);
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      body.style.position = '';
      body.style.touchAction = '';
      delete body.dataset.feedViewerOpen;
      html.style.overflow = '';
      html.style.touchAction = '';

      const restore = () => window.scrollTo(0, restoreY);
      restore();
      requestAnimationFrame(() => {
        restore();
        requestAnimationFrame(restore);
      });
    };
  }, [locked]);
}
