'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Package, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';
import ProfileSection from '@/components/profile/ProfileSection';

type InterestRow = {
  productId: string;
  productName: string;
  favoriteCount: number;
};

type Props = {
  products: Product[];
};

export default function SellerEngagementHub({ products }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<InterestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const ids = products.map((p) => p.id).filter(Boolean);
      if (ids.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .in('product_id', ids);
      if (cancelled) return;
      if (error) {
        console.warn('[seller engagement]', error.message);
        setRows([]);
        setLoading(false);
        return;
      }
      const counts = new Map<string, number>();
      for (const row of data || []) {
        const pid = row.product_id as string;
        counts.set(pid, (counts.get(pid) || 0) + 1);
      }
      const list: InterestRow[] = [];
      for (const p of products) {
        const c = counts.get(p.id) || 0;
        if (c > 0) {
          list.push({ productId: p.id, productName: p.name, favoriteCount: c });
        }
      }
      list.sort((a, b) => b.favoriteCount - a.favoriteCount);
      setRows(list);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [products]);

  if (loading) {
    return (
      <p className="text-sm text-gray-500 py-2">{t('common.loading')}</p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center">
        <Heart size={28} className="mx-auto mb-2 text-[#007782]/50" />
        <p className="text-sm font-medium text-gray-700">{t('sellerEngagement.empty')}</p>
        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">{t('sellerEngagement.emptyHint')}</p>
      </div>
    );
  }

  return (
    <ProfileSection
      title={t('sellerEngagement.title')}
      description={t('sellerEngagement.subtitle')}
    >
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.productId}
            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{row.productName}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('sellerEngagement.favorites', { count: row.favoriteCount })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                href={`/products/${row.productId}`}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Tag size={14} />
                {t('sellerEngagement.viewListing')}
              </Link>
              <Link
                href={`/messages?product=${row.productId}`}
                className="inline-flex items-center gap-1 rounded-full bg-[#007782] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00616b]"
              >
                <MessageCircle size={14} />
                {t('sellerEngagement.sendOffer')}
              </Link>
              <Link
                href={`/messages?product=${row.productId}&template=bundle`}
                className="inline-flex items-center gap-1 rounded-full border border-[#007782] px-3 py-1.5 text-xs font-semibold text-[#007782] hover:bg-[#007782]/5"
              >
                <Package size={14} />
                {t('sellerEngagement.bundleHint')}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}
