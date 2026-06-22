'use client';

import { useEffect, useState } from 'react';

const MOBILE_MQ = '(max-width: 767px)';

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_MQ).matches;
}

/** Nem kritikus munka — feed LCP után. */
export function runWhenIdle(fn: () => void, timeoutMs = 2000): void {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => fn(), { timeout: timeoutMs });
  } else {
    setTimeout(fn, Math.min(timeoutMs, 150));
  }
}

export function useIsMobileViewport(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : true,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return mobile;
}
