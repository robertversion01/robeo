'use client';

import { useEffect, useState } from 'react';
import { useHorizontalMouseScroll } from '@/hooks/useHorizontalMouseScroll';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { normalizePrimaryProductImageUrl } from '@/lib/productImageValidation';
import ProductImage from '@/components/product/ProductImage';
import type { Product } from '@/types';

type Props = {
  sellerId: string;
  excludeProductId: string;
};

export default function SellerMoreListings({ sellerId, excludeProductId }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Product[]>([]);
  const scrollRef = useHorizontalMouseScroll<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from('products')
      .select('id, name, price, image_url, images')
      .eq('user_id', sellerId)
      .or('status.eq.active,status.is.null')
      .neq('id', excludeProductId)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (!cancelled) setItems((data || []) as Product[]);
      });
    return () => {
      cancelled = true;
    };
  }, [sellerId, excludeProductId]);

  if (items.length === 0) return null;

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{t('pdp.moreFromSeller')}</h3>
        <Link
          href={`/profile/${sellerId}/closet`}
          className="text-xs font-semibold text-[#007782] hover:underline"
        >
          {t('pdp.viewCloset')} →
        </Link>
      </div>
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
            className="shrink-0 w-[108px] rounded-lg border border-gray-200 bg-white overflow-hidden"
          >
            <div className="aspect-[4/5] bg-gray-100">
              {imageUrl ? (
                <ProductImage
                  src={getOptimizedImageUrl(imageUrl, 120, 80)}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="p-1.5">
              <p className="text-[10px] truncate text-gray-800">{p.name}</p>
              <p className="text-[10px] font-bold text-[#007782]">{formatPrice(p.price)}</p>
            </div>
          </Link>
          );
        })}
      </div>
    </section>
  );
}
