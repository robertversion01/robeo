'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  formatOfferRemaining,
  isOfferPastExpiry,
  offerRemainingMs,
} from '@/lib/offerExpiry';

type Props = {
  expiresAt: string | null | undefined;
  className?: string;
};

export default function OfferExpiryCountdown({ expiresAt, className = '' }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en' : 'hu';
  const [, tick] = useState(0);

  useEffect(() => {
    if (!expiresAt || isOfferPastExpiry(expiresAt)) return;
    const id = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return null;

  if (isOfferPastExpiry(expiresAt) || offerRemainingMs(expiresAt) <= 0) {
    return (
      <p className={`inline-flex items-center gap-1 text-xs font-medium text-amber-700 ${className}`}>
        <Clock size={12} />
        {t('offerExpiry.expired')}
      </p>
    );
  }

  const remaining = formatOfferRemaining(expiresAt, locale);
  return (
    <p className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}>
      <Clock size={12} className="shrink-0" />
      {t('offerExpiry.remaining', { time: remaining })}
    </p>
  );
}
