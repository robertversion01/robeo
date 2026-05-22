'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/layout/PageHeader';
import OrderHistoryPanel from '@/components/orders/OrderHistoryPanel';
import { MAIN_TOP_PADDING, MOBILE_PAGE_BOTTOM_CLASS } from '@/lib/layoutTokens';

export default function OrdersPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [initialTab, setInitialTab] = useState<'purchases' | 'sales'>('purchases');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }
      if (typeof window !== 'undefined') {
        const view = new URLSearchParams(window.location.search).get('view');
        if (view === 'sales') setInitialTab('sales');
        else if (view === 'purchases') setInitialTab('purchases');
      }
      setReady(true);
    };
    void init();
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#007782] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className={`${MAIN_TOP_PADDING} ${MOBILE_PAGE_BOTTOM_CLASS} px-4`}>
        <div className="max-w-lg mx-auto">
          <PageHeader title={t('orders.title')} subtitle={t('orders.subtitle')} />
          <OrderHistoryPanel initialTab={initialTab} />
        </div>
      </main>
    </div>
  );
}
