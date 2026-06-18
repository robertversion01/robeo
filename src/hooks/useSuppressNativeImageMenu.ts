'use client';

import { useEffect } from 'react';

const GALLERY_SELECTOR = '[data-product-card-gallery], [data-feed-image-viewer]';

function isGalleryTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(GALLERY_SELECTOR));
}

/** iOS/Android: blokkolja a böngésző „Kép mentése” menüt galéria zónákban. */
export function useSuppressNativeImageMenu() {
  useEffect(() => {
    const block = (e: Event) => {
      if (!isGalleryTarget(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener('contextmenu', block, true);
    document.addEventListener('selectstart', block, true);
    document.addEventListener('dragstart', block, true);

    return () => {
      document.removeEventListener('contextmenu', block, true);
      document.removeEventListener('selectstart', block, true);
      document.removeEventListener('dragstart', block, true);
    };
  }, []);
}
