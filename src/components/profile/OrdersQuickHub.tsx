'use client';

import Link from 'next/link';
import { Package, ShoppingBag, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ROBEO_BP_MODE } from '@/lib/features';

/** Központi belépőpont: minden link `/orders`-ra mutat (tab query opcionális).
 *  RobeoBP-ben rejtve — nincs rendelés-nyomonkövetés, foglalások a chatben. */
export default function OrdersQuickHub({ className }: { className?: string }) {
  const { t } = useTranslation();
  if (ROBEO_BP_MODE) return null;

  return (
    <div className={cn('mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3', className)}>
      <Link
        href="/orders"
        className="flex items-start gap-3 rounded-xl border border-[#007782]/25 bg-[#007782]/5 p-4 hover:border-[#007782]/40 transition-colors"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a2328] text-[#007782]">
          <ShoppingBag size={20} />
        </span>
        <span>
          <span className="block text-sm font-bold text-[#e7edf0]">{t('orders.purchases')}</span>
          <span className="mt-0.5 block text-xs text-[#8fa3ad] leading-snug">{t('ordersHub.purchasesHint')}</span>
        </span>
      </Link>
      <Link
        href="/orders"
        className="flex items-start gap-3 rounded-xl border border-emerald-900/45 bg-emerald-950/35 p-4 hover:border-emerald-900/45 transition-colors"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a2328] text-emerald-300">
          <Truck size={20} />
        </span>
        <span>
          <span className="block text-sm font-bold text-[#e7edf0]">{t('orders.sales')}</span>
          <span className="mt-0.5 block text-xs text-[#8fa3ad] leading-snug">{t('ordersHub.salesHint')}</span>
        </span>
      </Link>
      <Link
        href="/orders"
        className="sm:col-span-2 flex items-center justify-center gap-2 rounded-xl border border-[#2a3941] bg-[#1a2328] px-4 py-3 text-sm font-semibold text-[#007782] hover:bg-[#1f2a30]"
      >
        <Package size={16} />
        {t('orders.viewAll')} →
      </Link>
    </div>
  );
}
