'use client';

import { useEffect } from 'react';

const SW_URL = `/sw.js?v=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_BUILD_ID ?? '1')}`;

/** SW regisztráció minden látogatónál — push + stale-while-revalidate cache. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV === 'development') return;

    let cancelled = false;

    const register = async () => {
      try {
        const existing = await navigator.serviceWorker.getRegistration('/');
        if (cancelled) return;
        if (existing) {
          await existing.update();
          return;
        }
        await navigator.serviceWorker.register(SW_URL, { scope: '/' });
      } catch {
        /* SW opcionális — ne törje az appot */
      }
    };

    void register();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
