'use client';

import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import HelpSupportHub from '@/components/help/HelpSupportHub';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

export default function HelpPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className={`${MAIN_TOP_PADDING} px-4`}>
        <div className="max-w-lg mx-auto">
          <PageHeader title={t('help.title')} subtitle={t('help.subtitle')} />
          <HelpSupportHub />
        </div>
      </main>
    </div>
  );
}
