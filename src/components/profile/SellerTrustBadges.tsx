'use client';

import { ShieldCheck, Star, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StarRating from '@/components/review/StarRating';

type Props = {
  avgRating: number | null;
  reviewCount: number;
  followers: number;
  listingsCount: number;
  className?: string;
};

export default function SellerTrustBadges({
  avgRating,
  reviewCount,
  followers,
  listingsCount,
  className = '',
}: Props) {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {avgRating != null && reviewCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-xs font-medium text-[#e7edf0]">
          <Star size={12} className="text-amber-500" />
          {avgRating.toFixed(1)}
          <StarRating rating={avgRating} size={12} />
          <span className="text-[#8fa3ad]">({reviewCount})</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#2a3941] px-2.5 py-1 text-xs text-[#8fa3ad]">
          {t('sellerTrust.noReviews')}
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-xs text-[#b2c0c6]">
        <Users size={12} className="text-[#007782]" />
        {t('sellerTrust.followers', { count: followers })}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-[#2a3941] bg-[#1a2328] px-2.5 py-1 text-xs text-[#b2c0c6]">
        <ShieldCheck size={12} className="text-[#007782]" />
        {t('sellerTrust.listings', { count: listingsCount })}
      </span>
    </div>
  );
}
