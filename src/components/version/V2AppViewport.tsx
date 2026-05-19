'use client';

import { useEffect, useState } from 'react';

/**
 * Vite v2 SPA beágyazása. Alapértelmezés: ugyanaz a host, mint a Next (LAN-on is jó), 5173-as port.
 * Felülírható: NEXT_PUBLIC_V2_URL (teljes URL, pl. http://127.0.0.1:5173).
 */
export default function V2AppViewport() {
  const [iframeSrc, setIframeSrc] = useState('');

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- iframe URL needs `window` (host); not available at SSR */
    const explicit = process.env.NEXT_PUBLIC_V2_URL?.trim();
    if (explicit) {
      setIframeSrc(explicit);
      return;
    }
    setIframeSrc(
      `${window.location.protocol}//${window.location.hostname}:5173`,
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (!iframeSrc) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-gray-600">
        v2 előnézet betöltése…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-50">
      <iframe
        title="ROBEO v2 (Vite)"
        src={iframeSrc}
        className="min-h-0 w-full flex-1 border-0"
        referrerPolicy="same-origin"
      />
      <p className="shrink-0 border-t border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
        v2: ha üres az ablak, indítsd a <code className="rounded bg-gray-100 px-1">frontend</code> mappában a{' '}
        <code className="rounded bg-gray-100 px-1">npm run dev</code> parancsot (port 5173), és hogy a backend fusson
        a 5055-ön (proxy).
      </p>
    </div>
  );
}
