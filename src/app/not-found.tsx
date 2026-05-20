'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { MAIN_TOP_PADDING, MOBILE_PAGE_BOTTOM_CLASS } from '@/lib/layoutTokens';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className={`min-h-screen bg-white text-gray-900 ${MAIN_TOP_PADDING} ${MOBILE_PAGE_BOTTOM_CLASS} flex items-center justify-center px-4`}>
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-[#007782] mb-3">404</div>
        <h1 className="text-2xl font-bold mb-3">{t('notFound.title')}</h1>
        <p className="text-gray-500 mb-8">{t('notFound.description')}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full bg-[#007782] px-5 text-sm font-semibold text-white hover:bg-[#006670]"
          >
            ← {t('notFound.backHome')}
          </Link>
          <Link
            href="/browse"
            className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {t('notFound.browse')}
          </Link>
        </div>
      </div>
    </div>
  );
}
