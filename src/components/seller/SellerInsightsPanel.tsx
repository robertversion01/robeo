'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, TrendingUp, Coins, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { fetchSellerInsights, type SellerInsightRow } from '@/lib/sellerInsights';
import { formatPrice } from '@/lib/utils';
import ProfileSection from '@/components/profile/ProfileSection';

type Props = {
  sellerId: string;
};

const EMPTY: SellerInsightRow = {
  totalSales: 0,
  grossRevenue: 0,
  netRevenue: 0,
  avgSalePrice: 0,
  lastMonthRevenue: 0,
  monthlyBuckets: [],
  topProducts: [],
};

function monthLabel(key: string, locale: string): string {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
}

export default function SellerInsightsPanel({ sellerId }: Props) {
  const { t, i18n } = useTranslation();
  const [insights, setInsights] = useState<SellerInsightRow>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const data = await fetchSellerInsights(supabase, sellerId);
      if (!cancelled) {
        setInsights(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  if (loading) {
    return <p className="text-sm text-[#8fa3ad] py-2">{t('common.loading')}</p>;
  }

  if (insights.totalSales === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#2a3941] bg-[#141d21]/80 px-4 py-6 text-center">
        <BarChart3 size={28} className="mx-auto mb-2 text-[#007782]/50" />
        <p className="text-sm font-medium text-[#b2c0c6]">{t('sellerInsights.empty')}</p>
        <p className="text-xs text-[#8fa3ad] mt-1 max-w-xs mx-auto">
          {t('sellerInsights.emptyHint')}
        </p>
      </div>
    );
  }

  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const maxRevenue = Math.max(1, ...insights.monthlyBuckets.map((b) => b.revenue));

  const tiles = [
    {
      icon: Coins,
      label: t('sellerInsights.netRevenue'),
      value: formatPrice(insights.netRevenue),
      sub: t('sellerInsights.grossHint', { gross: formatPrice(insights.grossRevenue) }),
    },
    {
      icon: TrendingUp,
      label: t('sellerInsights.lastMonth'),
      value: formatPrice(insights.lastMonthRevenue),
      sub: t('sellerInsights.totalSalesHint', { count: insights.totalSales }),
    },
    {
      icon: Award,
      label: t('sellerInsights.avgSale'),
      value: formatPrice(insights.avgSalePrice),
      sub: t('sellerInsights.topCountHint', { count: insights.topProducts.length }),
    },
  ];

  return (
    <ProfileSection
      title={t('sellerInsights.title')}
      description={t('sellerInsights.subtitle')}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-[#2a3941] bg-[#1a2328] p-3 flex flex-col gap-1"
          >
            <tile.icon size={16} className="text-[#007782]" />
            <span className="text-[10px] uppercase tracking-wide text-[#8fa3ad]">{tile.label}</span>
            <span className="text-lg font-bold text-[#e7edf0] tabular-nums">{tile.value}</span>
            <span className="text-[10px] text-[#6b7d85] truncate">{tile.sub}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#2a3941] bg-[#1a2328] p-3 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8fa3ad] mb-2">
          {t('sellerInsights.monthlyTitle')}
        </p>
        <ul className="space-y-1.5">
          {insights.monthlyBuckets.map((b) => {
            const widthPct = Math.round((b.revenue / maxRevenue) * 100);
            return (
              <li key={b.month} className="flex items-center gap-2 text-xs">
                <span className="w-12 shrink-0 text-[#8fa3ad]">{monthLabel(b.month, locale)}</span>
                <div className="flex-1 h-3 rounded-full bg-[#1a2328] overflow-hidden">
                  <div
                    className="h-full bg-[#007782]/80"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right font-semibold text-[#b2c0c6] tabular-nums">
                  {formatPrice(b.revenue)}
                </span>
                <span className="w-8 shrink-0 text-right text-[#6b7d85] tabular-nums">{b.count}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl border border-[#2a3941] bg-[#1a2328] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8fa3ad] mb-2">
          {t('sellerInsights.topProductsTitle')}
        </p>
        <ul className="space-y-1.5">
          {insights.topProducts.map((p) => (
            <li
              key={p.productId}
              className="flex items-center gap-2 text-xs justify-between"
            >
              <Link
                href={`/products/${p.productId}`}
                className="flex-1 truncate text-[#e7edf0] hover:underline"
              >
                {p.name}
              </Link>
              <span className="shrink-0 text-[#8fa3ad] tabular-nums">×{p.soldCount}</span>
              <span className="w-24 shrink-0 text-right font-semibold text-[#007782] tabular-nums">
                {formatPrice(p.revenue)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ProfileSection>
  );
}
