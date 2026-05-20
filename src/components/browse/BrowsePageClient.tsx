'use client';

import { useTranslation } from 'react-i18next';
import CatalogBrowsePanel from '@/components/browse/CatalogBrowsePanel';
import PageHeader from '@/components/layout/PageHeader';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

export default function BrowsePageClient() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-white text-gray-900">
      <main className={`${MAIN_TOP_PADDING} px-2 pb-20 md:px-6 md:pb-8`}>
        <div className="mx-auto max-w-7xl">
          <PageHeader title={t('browse.pageTitle')} subtitle={t('browse.pageSubtitle')} />
          <CatalogBrowsePanel browsePath="/browse" stickyTopClass="top-11" showPersonalization />
        </div>
      </main>
    </div>
  );
}
