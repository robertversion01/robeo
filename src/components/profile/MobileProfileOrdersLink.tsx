'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Rendelések gyors link — mobilon, mivel nincs a 5 tabos alsó sávban (Hacoo elrendezés). */
export default function MobileProfileOrdersLink() {
  const { t } = useTranslation();

  return (
    <Link
      href="/orders"
      className="mb-4 flex md:hidden items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 touch-manipulation active:bg-gray-100"
    >
      <Package size={18} className="text-[#007782]" />
      {t('nav.orders')}
      <span className="ml-auto text-[#007782]">→</span>
    </Link>
  );
}
