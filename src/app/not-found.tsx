import Link from 'next/link';
import { MAIN_TOP_PADDING, MOBILE_PAGE_BOTTOM_CLASS } from '@/lib/layoutTokens';

/** Szerver komponens — nincs i18n hydration mismatch (React #418). */
export default function NotFound() {
  return (
    <div
      className={`min-h-screen bg-white text-gray-900 ${MAIN_TOP_PADDING} ${MOBILE_PAGE_BOTTOM_CLASS} flex items-center justify-center px-4`}
    >
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-[#007782] mb-3">404</div>
        <h1 className="text-2xl font-bold mb-3">Az oldal nem található</h1>
        <p className="text-gray-500 mb-8">
          A keresett oldal nem létezik, vagy törölték.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full bg-[#007782] px-5 text-sm font-semibold text-white hover:bg-[#006670]"
          >
            ← Vissza a főoldalra
          </Link>
          <Link
            href="/browse"
            className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Böngészés
          </Link>
        </div>
      </div>
    </div>
  );
}
