'use client';

import { ShieldCheck, Star, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StarRating from '@/components/review/StarRating';

type Props = {
  avgRating: number | null;
  reviewCount: number;
  followers: number;
  listingsCount: number;
};

export default function SellerTrustBadges({
  avgRating,
  reviewCount,
  followers,
  listingsCount,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {avgRating != null && reviewCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-800">
          <Star size={12} className="text-amber-500" />
          {avgRating.toFixed(1)}
          <StarRating rating={avgRating} size={12} />
          <span className="text-gray-500">({reviewCount})</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-200 px-2.5 py-1 text-xs text-gray-500">
          {t('sellerTrust.noReviews')}
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700">
        <Users size={12} className="text-[#007782]" />
        {t('sellerTrust.followers', { count: followers })}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700">
        <ShieldCheck size={12} className="text-[#007782]" />
        {t('sellerTrust.listings', { count: listingsCount })}
      </span>
    </div>
  );
}
