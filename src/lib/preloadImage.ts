const preloaded = new Set<string>();

/** link rel=preload — LCP és long-press spekulatív warmup (fetchpriority). */
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
