'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Clock, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { fetchSellerTrustSignals, type SellerTrustSignals } from '@/lib/sellerTrust';
import StarRating from '@/components/review/StarRating';
import { cn } from '@/lib/utils';

type Props = {
  sellerId: string;
  className?: string;
};

export default function SellerTrustPanel({ sellerId, className }: Props) {
  const { t, i18n } = useTranslation();
  const [signals, setSignals] = useState<SellerTrustSignals | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSellerTrustSignals(supabase, sellerId).then((s) => {
      if (!cancelled) setSignals(s);
    });
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  if (!signals) return null;

  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const memberLabel = signals.memberSince
    ? new Date(signals.memberSince).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
      })
    : '—';

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {signals.verified ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#007782]/30 bg-[#007782]/10 px-2.5 py-1 text-xs font-semibold text-[#007782]">
          <BadgeCheck size={14} />
          {t('sellerTrust.verified')}
        </span>
      ) : null}
      {signals.avgRating != null && signals.reviewCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs">
          <Star size={12} className="text-amber-500" />
          {signals.avgRating.toFixed(1)}
          <StarRating rating={signals.avgRating} size={12} />
          <span className="text-gray-500">({signals.reviewCount})</span>
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700">
        <Clock size={12} className="text-[#007782]" />
        {t(signals.responseLabelKey)}
      </span>
      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">
        {t('sellerTrust.memberSince', { date: memberLabel })}
      </span>
      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">
        {t('sellerTrust.listings', { count: signals.listingsCount })}
      </span>
    </div>
  );
}
