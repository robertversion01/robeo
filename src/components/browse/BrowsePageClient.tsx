'use client';

import { useTranslation } from 'react-i18next';
import CatalogBrowsePanel from '@/components/browse/CatalogBrowsePanel';
import PageHeader from '@/components/layout/PageHeader';
import { DESKTOP_TOP_PADDING } from '@/lib/layoutTokens';

export default function BrowsePageClient() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-white text-gray-900">
      <main className={`px-2 pb-0 md:px-6 md:pb-12 ${DESKTOP_TOP_PADDING}`}>
        <div className="mx-auto max-w-7xl">
          <PageHeader
            title={t('browse.pageTitle')}
            subtitle={t('browse.pageSubtitle')}
            className="hidden md:block"
          />
          <CatalogBrowsePanel
            browsePath="/browse"
            stickyTopClass="top-0"
            showPersonalization
            variant="search"
          />
        </div>
      </main>
    </div>
  );
}
