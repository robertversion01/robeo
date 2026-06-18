'use client';

import { useEffect, useState } from 'react';
import { useHorizontalMouseScroll } from '@/hooks/useHorizontalMouseScroll';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import PresetImage from '@/components/product/PresetImage';
import { normalizePrimaryProductImageUrl } from '@/lib/productImageValidation';
import ProductAlertsBar from '@/components/product/ProductAlertsBar';
import type { Product } from '@/types';
import { categoryDbValues, productMatchesCategory, normalizeCategory, CATEGORY_ALIASES } from '@/lib/catalogFilters';
import { normalizeBudapestDistrict } from '@/lib/budapestDistricts';

type Props = {
  productId: string;
  category: string | null | undefined;
  brand?: string | null;
  size?: string | null;
  price?: number;
  district?: string | null;
  /** Ha kevés a találat, megjelenik a mentett keresés / árfigyelő sáv. */
  alertProduct?: Pick<
    Product,
    'id' | 'name' | 'price' | 'category' | 'brand' | 'size' | 'condition' | 'color' | 'budapest_district'
  > | null;
};

function resolveCategoryFilterId(raw: string | null | undefined): string {
  if (!raw) return 'other';
  const norm = normalizeCategory(raw);
  for (const [id, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.includes(norm)) return id;
  }
  return 'other';
}

function scoreSimilar(
  p: Product,
  ref: { brand?: string | null; size?: string | null; price: number; district?: string | null },
): number {
  let score = 0;
  if (ref.brand) {
    const b = ref.brand.toLowerCase();
    if ((p.brand || '').toLowerCase() === b) score += 4;
    else if ((p.brand || '').toLowerCase().includes(b)) score += 2;
  }
  if (ref.size) {
    const s = ref.size.toLowerCase();
    if ((p.size || '').toLowerCase().includes(s)) score += 3;
  }
  const d = normalizeBudapestDistrict(ref.district);
  if (d && normalizeBudapestDistrict(p.budapest_district) === d) score += 2;
  if (ref.price > 0) {
    const ratio = Math.abs(Number(p.price) - ref.price) / ref.price;
    if (ratio <= 0.15) score += 3;
    else if (ratio <= 0.3) score += 2;
    else if (ratio <= 0.5) score += 1;
    if (ratio > 0.8) score -= 2;
  }
  return score;
}

export default function SimilarProductsRail({
  productId,
  category,
  brand,
  size,
  price = 0,
  district,
  alertProduct,
}: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Product[]>([]);
  const scrollRef = useHorizontalMouseScroll<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const filterId = resolveCategoryFilterId(category);
      const catValues = categoryDbValues(filterId);

      let query = supabase
        .from('products')
        .select('id, name, price, image_url, images, category, brand, size, budapest_district')
        .or('status.eq.active,status.is.null')
        .neq('id', productId)
        .order('created_at', { ascending: false })
        .limit(36);

      if (catValues.length === 1) {
        query = query.eq('category', catValues[0]);
      } else if (catValues.length > 1) {
        query = query.in('category', catValues);
      }

      const { data } = await query;
      if (cancelled) return;

      let list = (data || []) as Product[];
      list = list.filter((p) => productMatchesCategory(p.category, filterId));

      const ref = { brand, size, price, district };
      list = list
        .map((p) => ({ p, score: scoreSimilar(p, ref) }))
        .sort((a, b) => b.score - a.score || Number(b.p.price) - Number(a.p.price))
        .map(({ p }) => p);

      setItems(list.slice(0, 12));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [productId, category, brand, size, price, district]);

  const showFallback = items.length < 3 && alertProduct;

  if (items.length === 0 && !showFallback) return null;

  return (
    <section className="mb-4">
      <h3 className="text-sm font-semibold text-[#e7edf0] mb-1">{t('pdp.similar')}</h3>
      {items.length > 0 && items.length < 3 ? (
        <p className="text-[11px] text-[#8fa3ad] mb-2">{t('pdp.similarFew')}</p>
      ) : null}

      {items.length > 0 ? (
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto overscroll-x-contain no-scrollbar pb-1 cursor-grab [&.is-drag-scrolling]:cursor-grabbing [&.is-drag-scrolling_a]:pointer-events-none"
        >
          {items.map((p) => {
            const imageUrl = normalizePrimaryProductImageUrl(p);
            return (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="shrink-0 w-[108px] rounded-lg border border-[#2a3941] bg-[#1a2328] overflow-hidden hover:border-[#007782]/40"
              >
                <div className="aspect-[4/5] bg-[#1a2328]">
                  {imageUrl ? (
                    <PresetImage
                      url={imageUrl}
                      preset="railCard"
                      alt={p.name}
                      className="h-full w-full object-contain bg-[#0f1a1d]/5"
                    />
                  ) : null}
                </div>
                <div className="p-1.5">
                  <p className="text-[10px] truncate text-[#e7edf0]">{p.name}</p>
                  <p className="text-[10px] font-bold text-[#007782]">{formatPrice(p.price)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {showFallback && alertProduct ? (
        <div className="mt-2">
          <p className="text-xs text-[#8fa3ad] mb-2">{t('pdp.similarEmpty')}</p>
          <ProductAlertsBar product={alertProduct} />
        </div>
      ) : null}
    </section>
  );
}
