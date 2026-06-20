/** Shared element name — feed kártya ↔ PDP hero. */
export function productViewTransitionName(productId: string): string {
  return `robeo-product-${productId}`;
}

export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

/** Csak mobilon / érintésen — ahol a morph tényleg javít. */
export function shouldUseProductViewTransition(): boolean {
  if (!supportsViewTransitions()) return false;
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 768px)').matches;
  return coarse || narrow;
}