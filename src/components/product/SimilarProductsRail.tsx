'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { categoryDbValues, productMatchesCategory, normalizeCategory, CATEGORY_ALIASES } from '@/lib/catalogFilters';
import type { Product } from '@/types';

type Props = {
  productId: string;
  category: string | null | undefined;
  brand?: string | null;
  size?: string | null;
};

function resolveCategoryFilterId(raw: string | null | undefined): string {
  if (!raw) return 'other';
  const norm = normalizeCategory(raw);
  for (const [id, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.includes(norm)) return id;
  }
  return 'other';
}

export default function SimilarProductsRail({ productId, category, brand, size }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const filterId = resolveCategoryFilterId(category);
      const catValues = categoryDbValues(filterId);

      let query = supabase
        .from('products')
        .select('id, name, price, image_url, category, brand, size')
        .or('status.eq.active,status.is.null')
        .neq('id', productId)
        .order('created_at', { ascending: false })
        .limit(24);

      if (catValues.length === 1) {
        query = query.eq('category', catValues[0]);
      } else if (catValues.length > 1) {
        query = query.in('category', catValues);
      }

      const { data } = await query;
      if (cancelled) return;

      let list = (data || []) as Product[];
      list = list.filter((p) => productMatchesCategory(p.category, filterId));

      if (brand) {
        const brandLower = brand.toLowerCase();
        list = list.sort((a, b) => {
          const aMatch = (a.brand || '').toLowerCase() === brandLower ? 1 : 0;
          const bMatch = (b.brand || '').toLowerCase() === brandLower ? 1 : 0;
          return bMatch - aMatch;
        });
      }

      if (size) {
        const sizeLower = size.toLowerCase();
        list = list.sort((a, b) => {
          const aMatch = (a.size || '').toLowerCase().includes(sizeLower) ? 1 : 0;
          const bMatch = (b.size || '').toLowerCase().includes(sizeLower) ? 1 : 0;
          return bMatch - aMatch;
        });
      }

      setItems(list.slice(0, 12));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [productId, category, brand, size]);

  if (items.length === 0) return null;

  return (
    <section className="mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('pdp.similar')}</h3>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="shrink-0 w-[108px] rounded-lg border border-gray-200 bg-white overflow-hidden"
          >
            <div className="aspect-[4/5] bg-gray-100">
              {p.image_url ? (
                <img
                  src={getOptimizedImageUrl(p.image_url, 120, 150)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="p-1.5">
              <p className="text-[10px] truncate text-gray-800">{p.name}</p>
              <p className="text-[10px] font-bold text-[#007782]">{formatPrice(p.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
