'use client';

import { Heart, ShoppingBag, Star, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/lib/utils';

type Props = {
  soldCount: number;
  revenue: number;
  rating: number;
  listingsCount: number;
  favoritesOnListings?: number;
};

export default function ProfileMarketplaceStats({
  soldCount,
  revenue,
  rating,
  listingsCount,
  favoritesOnListings = 0,
}: Props) {
  const { t } = useTranslation();

  const tiles = [
    {
      icon: TrendingUp,
      label: t('profile.marketplace.revenue'),
      value: formatPrice(revenue),
    },
    {
      icon: ShoppingBag,
      label: t('profile.marketplace.sold'),
      value: String(soldCount),
    },
    {
      icon: Star,
      label: t('profile.marketplace.rating'),
      value: rating > 0 ? rating.toFixed(1) : '—',
    },
    {
      icon: Heart,
      label: t('profile.marketplace.favorites'),
      value: String(favoritesOnListings),
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-2">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-[#2a3941] bg-[#1a2328] p-3 flex flex-col gap-1"
        >
          <tile.icon size={16} className="text-[#38c7d0]" />
          <span className="text-[10px] uppercase tracking-wide text-[#8fa3ad]">{tile.label}</span>
          <span className="text-lg font-bold text-[#e7edf0] tabular-nums">{tile.value}</span>
          {tile.label === t('profile.marketplace.rating') && listingsCount > 0 ? (
            <span className="text-[10px] text-[#6b7d85]">
              {t('profile.marketplace.activeListings', { count: listingsCount })}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
