const preloaded = new Set<string>();

/** Decode cache melegítés — gördülékenyebb megjelenés link preload mellett. */
function warmImageInMemory(url: string, priority: 'high' | 'low' | 'auto'): void {
  if (typeof window === 'undefined') return;
  const img = new Image();
  if ('fetchPriority' in img) {
    (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = priority;
  }
  img.decoding = 'async';
  img.src = url;
  void img.decode?.().catch(() => undefined);
}

/** link rel=preload + Image decode — LCP és scroll előtti warmup. */
export function preloadImageUrl(
  url: string | null | undefined,
  priority: 'high' | 'low' | 'auto' = 'low',
): void {
  if (!url || typeof document === 'undefined' || preloaded.has(url)) return;
  preloaded.add(url);

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  if (priority === 'high') {
    link.setAttribute('fetchpriority', 'high');
  } else if (priority === 'low') {
    link.setAttribute('fetchpriority', 'low');
  }
  document.head.appendChild(link);

  warmImageInMemory(url, priority);

  window.setTimeout(() => {
    link.remove();
  }, 45_000);
}

export function preloadImageUrls(
  urls: Array<string | null | undefined>,
  priority: 'high' | 'low' | 'auto' = 'low',
): void {
  for (const url of urls) {
    preloadImageUrl(url, priority);
  }
}

/** Több méret — srcset-ből a legvalószínűbb mobil URL. */
export function preloadPresetSrc(
  src: string | null | undefined,
  srcSet: string | undefined,
  priority: 'high' | 'low' | 'auto' = 'low',
): void {
  preloadImageUrl(src, priority);
  if (!srcSet) return;
  const firstCandidate = srcSet.split(',')[0]?.trim().split(/\s+/)[0];
  if (firstCandidate && firstCandidate !== src) {
    preloadImageUrl(firstCandidate, priority);
  }
}
