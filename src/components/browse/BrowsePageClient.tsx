'use client';

import { useTranslation } from 'react-i18next';
import CatalogBrowsePanel from '@/components/browse/CatalogBrowsePanel';
import PageHeader from '@/components/layout/PageHeader';

export default function BrowsePageClient() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-white text-gray-900">
      <main className="pt-2 pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] px-2 md:pt-14 md:pb-12 md:px-6">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            title={t('browse.pageTitle')}
            subtitle={t('browse.pageSubtitle')}
            className="hidden md:block"
          />
          <CatalogBrowsePanel
            browsePath="/browse"
            stickyTopClass="top-0 md:top-11"
            showPersonalization
            variant="search"
          />
        </div>
      </main>
    </div>
  );
}
