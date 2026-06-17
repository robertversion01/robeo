'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ROBEO_BP_MODE } from '@/lib/features';

/** Rendelések gyors link — mobilon, mivel nincs a 5 tabos alsó sávban (Hacoo elrendezés).
 *  RobeoBP-ben rejtve (nincs rendeles-nyomonkovetes oldal). */
export default function MobileProfileOrdersLink() {
  const { t } = useTranslation();
  if (ROBEO_BP_MODE) return null;

  return (
    <Link
      href="/orders"
      className="mb-4 flex md:hidden items-center gap-2 rounded-xl border border-[#2a3941] bg-[#141d21] px-4 py-3 text-sm font-semibold text-[#e7edf0] touch-manipulation active:bg-[#243038]"
    >
      <Package size={18} className="text-[#007782]" />
      {t('nav.orders')}
      <span className="ml-auto text-[#007782]">→</span>
    </Link>
  );
}
