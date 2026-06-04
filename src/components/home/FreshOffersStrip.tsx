'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import {
  fetchVacationSellerIdSet,
  filterProductsExcludingVacationSellers,
} from '@/lib/vacationMode';

type FreshItem = {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  category: string;
  user_id: string;
};

interface FreshOffersStripProps {
  title?: string;
  hint?: string;
  className?: string;
}

export default function FreshOffersStrip({
  title,
  hint,
  className = 'mb-5',
}: FreshOffersStripProps) {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<FreshItem[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const resolvedTitle = title ?? t('favorites.discoverTitle');
  const resolvedHint = hint ?? t('favorites.discoverHint');

  useEffect(() => {
    const loadFreshOffers = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, price, category, user_id')
        .or('status.eq.active,status.is.null')
        .order('created_at', { ascending: false })
        .limit(24);

      if (!error && data) {
        let rows = (data as FreshItem[]).filter(
          (p) => p.user_id && (p.price == null || Number(p.price) >= 0),
        );
        const vacationIds = await fetchVacationSellerIdSet(
          supabase,
          rows.map((p) => p.user_id),
        );
        rows = filterProductsExcludingVacationSellers(rows, vacationIds);
        setItems(rows.slice(0, 12));
      }
      setLoading(false);
    };

    void loadFreshOffers();
  }, []);

  if (loading) return null;

  return (
    <section className={className}>
      <div className="mb-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm md:text-base font-semibold text-gray-900">{resolvedTitle}</h2>
          <Link href="/browse" className="text-xs text-[#007782] hover:underline shrink-0">
            {t('favorites.discoverMore')}
          </Link>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{resolvedHint}</p>
      </div>

      {items.length === 0 ? (
        <div className="card-base px-4 py-3 text-sm text-gray-500">{t('favorites.discoverEmpty')}</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.id}`}
              className="min-w-[220px] max-w-[220px] card-base p-2.5 hover:border-[#007782]/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-14 w-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name || t('product.defaultProduct')}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400">📦</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{item.name || t('product.defaultProduct')}</p>
                  <p className="text-sm font-semibold text-[#007782] tabular-nums">
                    {item.price.toLocaleString(locale)} {t('common.currencyHuf')}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
