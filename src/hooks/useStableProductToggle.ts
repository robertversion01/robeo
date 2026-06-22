'use client';

import { useCallback, useRef } from 'react';

/** Stabil callback referencia termékenként — ProductCard memo nem törik scrollkor. */
export function useStableProductToggle(
  onToggle: (productId: string) => void,
): (productId: string) => () => void {
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;
  const cacheRef = useRef(new Map<string, () => void>());

  return useCallback((productId: string) => {
    const cache = cacheRef.current;
    let handler = cache.get(productId);
    if (!handler) {
      handler = () => onToggleRef.current(productId);
      cache.set(productId, handler);
    }
    return handler;
  }, []);
}
