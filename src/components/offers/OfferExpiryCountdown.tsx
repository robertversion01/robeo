'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  effectiveOfferExpiresAt,
  formatOfferRemaining,
  isOfferPastExpiry,
  offerRemainingMs,
} from '@/lib/offerExpiry';

import { useClientMounted } from '@/hooks/useClientMounted';

type Props = {
  expiresAt: string | null | undefined;
  createdAt?: string | null;
  className?: string;
};

export default function OfferExpiryCountdown({ expiresAt, createdAt, className = '' }: Props) {
  const { t, i18n } = useTranslation();
  const mounted = useClientMounted();
  const locale = i18n.language?.startsWith('en') ? 'en' : 'hu';
  const [, tick] = useState(0);
  const effectiveExpiresAt = effectiveOfferExpiresAt(expiresAt, createdAt);

  useEffect(() => {
    if (!effectiveExpiresAt || isOfferPastExpiry(expiresAt, createdAt)) return;
    const id = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [expiresAt, createdAt, effectiveExpiresAt]);

  if (!effectiveExpiresAt) return null;
  if (!mounted) {
    return (
      <p className={`inline-flex items-center gap-1 text-xs text-[#6b7d85] ${className}`}>
        <Clock size={12} className="shrink-0" />
        …
      </p>
    );
  }

  if (isOfferPastExpiry(expiresAt, createdAt) || offerRemainingMs(expiresAt, createdAt) <= 0) {
    return (
      <p className={`inline-flex items-center gap-1 text-xs font-medium text-amber-300 ${className}`}>
        <Clock size={12} />
        {t('offerExpiry.expired')}
      </p>
    );
  }

  const remaining = formatOfferRemaining(expiresAt, locale, createdAt);
  if (!remaining) return null;

  return (
    <p className={`inline-flex items-center gap-1 text-xs text-[#8fa3ad] ${className}`}>
      <Clock size={12} className="shrink-0" />
      {t('offerExpiry.remaining', { time: remaining })}
    </p>
  );
}
