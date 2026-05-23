'use client';

import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
  labelKey: 'sellerTrust.responseFast' | 'sellerTrust.responseNormal' | 'sellerTrust.responseSlow' | 'sellerTrust.responseNew';
  className?: string;
};

export default function ResponseTimeBadge({ labelKey, className = '' }: Props) {
  const { t } = useTranslation();
  if (labelKey === 'sellerTrust.responseNew') return null;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border border-[#007782]/20 bg-[#007782]/5 px-1.5 py-0.5 text-[10px] font-medium text-[#007782] ${className}`}
    >
      <Clock size={10} />
      {t(labelKey)}
    </span>
  );
}
