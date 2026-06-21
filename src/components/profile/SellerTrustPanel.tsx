'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Clock, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { fetchSellerTrustSignals, type SellerTrustSignals } from '@/lib/sellerTrust';
import { formatMedianResponseHours } from '@/lib/sellerResponseTime';
import { formatLastActiveLabel } from '@/lib/profileActivity';
import StarRating from '@/components/review/StarRating';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

type Props = {
  sellerId: string;
  className?: string;
  /** PDP above-fold: verified + rating + response egy sorban */
  variant?: 'full' | 'compact';
};

function TrustSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn('flex gap-2', compact ? 'flex-nowrap overflow-hidden' : 'flex-wrap')}
      aria-hidden
    >
      <div className="h-7 w-24 animate-pulse rounded-full bg-[#1a2328]" />
      <div className="h-7 w-20 animate-pulse rounded-full bg-[#1a2328]" />
      {compact ? (
        <div className="h-7 w-28 animate-pulse rounded-full bg-[#1a2328]" />
      ) : (
        <>
          <div className="h-7 w-32 animate-pulse rounded-full bg-[#1a2328]" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-[#1a2328]" />
        </>
      )}
    </div>
  );
}

export default function SellerTrustPanel({ sellerId, className, variant = 'full' }: Props) {
  const { t, i18n } = useTranslation();
  const [signals, setSignals] = useState<SellerTrustSignals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchSellerTrustSignals(supabase, sellerId).then((s) => {
      if (!cancelled) {
        setSignals(s);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  if (loading) {
    return (
      <div className={className}>
        <TrustSkeleton compact={variant === 'compact'} />
      </div>
    );
  }

  if (!signals) return null;

  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const memberLabel = signals.memberSince
    ? new Date(signals.memberSince).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
      })
    : '—';

  const responseLabel = (() => {
    const hours = formatMedianResponseHours(signals.medianResponseHours);
    if (hours != null && signals.responseSampleCount >= 2) {
      return t('sellerTrust.responseWithinHours', { hours });
    }
    return t(signals.responseLabelKey);
  })();

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar', className)}>
        {signals.verified ? (
          <Badge variant="verified" className="inline-flex shrink-0 items-center gap-1 px-2.5 py-1 text-xs">
            <BadgeCheck size={14} />
            {t('sellerTrust.verified')}
          </Badge>
        ) : null}
        {signals.avgRating != null && signals.reviewCount > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-xs">
            <Star size={12} className="text-amber-500" />
            {signals.avgRating.toFixed(1)}
            <span className="text-[#8fa3ad]">({signals.reviewCount})</span>
          </span>
        ) : null}
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-xs text-[#b2c0c6]">
          <Clock size={12} className="text-[#007782]" />
          {responseLabel}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {signals.verified ? (
        <Badge variant="verified" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs">
          <BadgeCheck size={14} />
          {t('sellerTrust.verified')}
        </Badge>
      ) : null}
      {signals.avgRating != null && signals.reviewCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-xs">
          <Star size={12} className="text-amber-500" />
          {signals.avgRating.toFixed(1)}
          <StarRating rating={signals.avgRating} size={12} />
          <span className="text-[#8fa3ad]">({signals.reviewCount})</span>
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1 rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-xs text-[#b2c0c6]">
        <Clock size={12} className="text-[#007782]" />
        {responseLabel}
      </span>
      <span className="rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-xs text-[#8fa3ad]">
        {t('sellerTrust.memberSince', { date: memberLabel })}
      </span>
      {(() => {
        const activeLabel = formatLastActiveLabel(signals.lastActiveAt, t);
        return activeLabel ? (
          <span className="rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-xs text-[#8fa3ad]">
            {activeLabel}
          </span>
        ) : null;
      })()}
      <span className="rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-xs text-[#8fa3ad]">
        {t('sellerTrust.listings', { count: signals.listingsCount })}
      </span>
      <span className="rounded-full border border-[#007782]/25 bg-[#007782]/5 px-2.5 py-1 text-xs font-semibold text-[#007782]">
        {t('sellerTrust.trustScore', { score: signals.trustScore })}
      </span>
      {signals.activeSeller ? (
        <span className="rounded-full border border-emerald-900/45 bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-300">
          {t('sellerTrust.active')}
        </span>
      ) : null}
    </div>
  );
}
