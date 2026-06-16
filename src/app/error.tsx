'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';
import { reportClientError } from '@/lib/clientErrorReporter';

/** Szegmens-szintű hibahatár — barátságos UI, nem üres képernyő. */
export default function Error({
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
    reportClientError(error?.message || 'segment error boundary', {
      stack: error?.stack,
      source: 'error-boundary',
    });
  }, [error]);

  return (
    <div
      className={`min-h-screen bg-white text-gray-900 ${MAIN_TOP_PADDING} flex items-center justify-center px-4`}
    >
      <div className="text-center max-w-md">
        <div className="text-5xl font-bold text-[#007782] mb-3">Hoppá</div>
        <h1 className="text-2xl font-bold mb-3">Valami félrement</h1>
        <p className="text-gray-500 mb-8">
          Átmeneti hiba történt. Próbáld újra, vagy térj vissza a főoldalra.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center rounded-full bg-[#007782] px-5 text-sm font-semibold text-white hover:bg-[#006670]"
          >
            Újrapróbálkozás
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Vissza a főoldalra
          </Link>
        </div>
      </div>
    </div>
  );
}
