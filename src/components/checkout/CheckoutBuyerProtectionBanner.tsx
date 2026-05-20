'use client';

import Link from 'next/link';
import { ShieldCheck, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function CheckoutBuyerProtectionBanner() {
  const { t } = useTranslation();

  return (
    <div className="bg-[#007782]/5 border border-[#007782]/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck size={20} className="text-[#007782] flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{t('checkout.buyerProtection')}</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t('checkout.buyerProtectionHint')}</p>
          <p className="text-[11px] text-gray-500 mt-2 flex items-start gap-1.5">
            <Info size={14} className="shrink-0 mt-0.5 text-[#007782]" aria-hidden />
            <span>{t('checkout.protectionFeeTooltip')}</span>
          </p>
          <Link
            href="/browse"
            className="inline-block mt-2 text-xs font-semibold text-[#007782] hover:underline"
          >
            {t('checkout.buyerProtectionLearnMore')}
          </Link>
        </div>
      </div>
    </div>
  );
}
