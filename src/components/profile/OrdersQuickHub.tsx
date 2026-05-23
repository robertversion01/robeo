'use client';

import Link from 'next/link';
import { Package, ShoppingBag, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/** Központi belépőpont: minden link `/orders`-ra mutat (tab query opcionális). */
export default function OrdersQuickHub({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn('mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3', className)}>
      <Link
        href="/orders"
        className="flex items-start gap-3 rounded-xl border border-[#007782]/25 bg-[#007782]/5 p-4 hover:border-[#007782]/40 transition-colors"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#007782]">
          <ShoppingBag size={20} />
        </span>
        <span>
          <span className="block text-sm font-bold text-gray-900">{t('orders.purchases')}</span>
          <span className="mt-0.5 block text-xs text-gray-600 leading-snug">{t('ordersHub.purchasesHint')}</span>
        </span>
      </Link>
      <Link
        href="/orders"
        className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 hover:border-emerald-300 transition-colors"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700">
          <Truck size={20} />
        </span>
        <span>
          <span className="block text-sm font-bold text-gray-900">{t('orders.sales')}</span>
          <span className="mt-0.5 block text-xs text-gray-600 leading-snug">{t('ordersHub.salesHint')}</span>
        </span>
      </Link>
      <Link
        href="/orders"
        className="sm:col-span-2 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#007782] hover:bg-gray-50"
      >
        <Package size={16} />
        {t('orders.viewAll')} →
      </Link>
    </div>
  );
}
