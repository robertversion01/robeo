'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/clientErrorReporter';

/** Gyökér-szintű hibahatár (a root layout helyett renderel) — önálló html/body. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    reportClientError(error?.message || 'global error boundary', {
      stack: error?.stack,
      source: 'global-error-boundary',
    });
  }, [error]);

  return (
    <html lang="hu">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          background: '#ffffff',
          color: '#111827',
          padding: '1rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#007782', marginBottom: '0.75rem' }}>
            Hoppá
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Valami félrement
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Átmeneti hiba történt. Próbáld újra, vagy töltsd újra az oldalt.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                height: '2.5rem',
                padding: '0 1.25rem',
                borderRadius: '9999px',
                border: 'none',
                background: '#007782',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Újrapróbálkozás
            </button>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '2.5rem',
                padding: '0 1.25rem',
                borderRadius: '9999px',
                border: '1px solid #d1d5db',
                color: '#374151',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              ← Vissza a főoldalra
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
