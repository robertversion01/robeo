'use client';

import Link from 'next/link';
import { Package, ShoppingBag, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MOBILE_TAB_PAGE_TOP } from '@/lib/layoutTokens';

/** Mobil profil: sötét fejléc + rendelés gyorsikonok (Hacoo struktúra, ROBEO színek). */
export default function ProfileMobileOrdersHeader() {
  const { t } = useTranslation();

  const items = [
    {
      href: '/orders?view=purchases',
      icon: ShoppingBag,
      label: t('orders.purchases'),
    },
    {
      href: '/orders?view=sales',
      icon: Truck,
      label: t('orders.sales'),
    },
    {
      href: '/orders',
      icon: Package,
      label: t('orders.viewAll'),
    },
  ] as const;

  return (
    <div
      className={`md:hidden bg-[#0f1a1d] px-3 pb-7 text-white ${MOBILE_TAB_PAGE_TOP}`}
    >
      <h2 className="mb-3 text-base font-bold">{t('nav.orders')}</h2>
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-white/10 px-2 py-3 text-center active:bg-white/15"
          >
            <Icon size={20} className="text-[#5ec4c9]" strokeWidth={1.75} />
            <span className="text-[10px] font-semibold leading-tight text-white/90">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
