'use client';

/**
 * Root error boundary — kötelező client komponens Next.js App Routerben.
 * Megakadályozza a build-time _global-error prerender hibát.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="hu">
      <body className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-white text-gray-900">
        <h1 className="text-lg font-bold">Hiba történt</h1>
        <p className="text-sm text-gray-600 text-center max-w-md">
          {error?.message || 'Ismeretlen hiba. Próbáld újra.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-[#007782] px-4 py-2 text-sm font-semibold text-white"
        >
          Újrapróbálás
        </button>
      </body>
    </html>
  );
}
