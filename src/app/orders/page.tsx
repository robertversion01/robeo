'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/layout/PageHeader';
import OrderHistoryPanel from '@/components/orders/OrderHistoryPanel';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';
import { ROBEO_BP_MODE } from '@/lib/features';

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
      <div className="min-h-screen flex items-center justify-center bg-[#1a2328]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#007782] border-t-transparent" />
      </div>
    );
  }

  // RobeoBP: direkt URL-bol nem ranthatja a klasszikus rendelesi listat —
  // BP-ben minden foglalas a chat-en zajlik (Stripe / Foxpost / wallet bypass).
  // Magyarazo uzenet + chatre vivo gomb. V1 path teljesen erintetlen.
  if (ROBEO_BP_MODE) {
    return (
      <div className="min-h-screen bg-[#11171a] text-[#e7edf0]">
        <main className={`${MAIN_TOP_PADDING} px-4`}>
          <div className="max-w-lg mx-auto py-8">
            <div className="rounded-2xl border border-emerald-900/45 bg-emerald-950/35 p-6 text-center">
              <p className="text-3xl mb-3" aria-hidden>🤝</p>
              <h1 className="text-xl font-bold text-emerald-200 mb-2">
                A foglalásaid a beszélgetéseidben jelennek meg
              </h1>
              <p className="text-sm text-emerald-200/80 leading-snug mb-5">
                RobeoBP béta: nincs külön rendelés-nyomonkövetés. Minden foglalás
                a chatben él — ott egyeztetitek a helyet, az időt és a fizetést
                (készpénz / direct P2P).
              </p>
              <Link
                href="/messages"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-5 min-h-11 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Beszélgetéseim megnyitása
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#11171a] text-[#e7edf0]">
      <main className={`${MAIN_TOP_PADDING} px-4`}>
        <div className="max-w-lg mx-auto">
          <PageHeader title={t('orders.title')} subtitle={t('orders.subtitle')} />
          <OrderHistoryPanel initialTab={initialTab} />
        </div>
      </main>
    </div>
  );
}
