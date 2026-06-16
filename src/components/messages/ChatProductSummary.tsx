'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { formatPrice } from '@/lib/utils';
import { isUuid } from '@/lib/validators';

type Props = {
  productId: string | null;
};

type ProductInfo = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  status?: string | null;
};

export default function ChatProductSummary({ productId }: Props) {
  const { t } = useTranslation();
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || !isUuid(productId)) {
      setProduct(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url, status')
        .eq('id', productId)
        .maybeSingle();
      if (cancelled) return;
      setLoading(false);
      if (error || !data) {
        setProduct(null);
        return;
      }
      setProduct({
        id: data.id,
        name: data.name,
        price: Number(data.price) || 0,
        image_url: data.image_url,
        status: data.status,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!productId) {
    return (
      <p className="mx-4 mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-center text-xs text-gray-500">
        {t('messages.noProductContext')}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="mx-4 mt-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 animate-pulse">
        <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-2 w-24 rounded bg-gray-100" />
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-16 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const statusLabel =
    product.status === 'sold'
      ? t('product.sold')
      : product.status === 'active'
        ? t('product.available')
        : null;

  return (
    <Link
      href={`/products/${product.id}`}
      className="mx-3 md:mx-4 mt-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:border-[#007782]/40 hover:bg-[#007782]/5 transition-colors touch-manipulation"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {product.image_url ? (
          <img
            src={getOptimizedImageUrl(product.image_url, 112, 80)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400 text-xl">📷</div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#007782]">
          {t('messages.productContextLabel')}
        </p>
        <p className="truncate font-semibold text-gray-900">{product.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm font-bold text-[#007782] tabular-nums">{formatPrice(product.price)}</p>
          {statusLabel ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              {statusLabel}
            </span>
          ) : null}
        </div>
      </div>
      <span className="hidden sm:inline shrink-0 text-xs font-medium text-[#007782]">
        {t('messages.viewProduct')}
      </span>
      <ChevronRight size={18} className="shrink-0 text-[#007782] sm:hidden" aria-hidden />
    </Link>
  );
}
