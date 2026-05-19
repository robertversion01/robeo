'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
};

export default function ChatProductSummary({ productId }: Props) {
  const [product, setProduct] = useState<ProductInfo | null>(null);

  useEffect(() => {
    if (!productId || !isUuid(productId)) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .eq('id', productId)
        .maybeSingle();
      if (cancelled || error || !data) {
        if (!cancelled) setProduct(null);
        return;
      }
      setProduct({
        id: data.id,
        name: data.name,
        price: Number(data.price) || 0,
        image_url: data.image_url,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!product) return null;

  return (
    <Link
      href={`/products/${product.id}`}
      className="mx-4 mt-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:border-[#007782]/40 hover:bg-[#007782]/5 transition-colors"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {product.image_url ? (
          <img
            src={getOptimizedImageUrl(product.image_url, 112, 80)}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400 text-xl">📷</div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Eladott termék
        </p>
        <p className="truncate font-semibold text-gray-900">{product.name}</p>
        <p className="text-sm font-bold text-[#007782] tabular-nums">{formatPrice(product.price)}</p>
      </div>
      <span className="shrink-0 text-xs font-medium text-[#007782]">Megtekintés →</span>
    </Link>
  );
}
