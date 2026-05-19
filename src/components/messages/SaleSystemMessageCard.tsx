'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { isSaleSystemMessage, SALE_NOTIFICATION_MARKER } from '@/lib/saleNotifications';

type Props = {
  content: string;
  productId: string | null;
  createdAt: string;
};

type ProductSnippet = { id: string; name: string; price: number };

export default function SaleSystemMessageCard({ content, productId, createdAt }: Props) {
  const [product, setProduct] = useState<ProductSnippet | null>(null);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', productId)
        .maybeSingle();
      if (!cancelled && data) {
        setProduct({ id: data.id, name: data.name, price: Number(data.price) || 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const displayText = content
    .replace(SALE_NOTIFICATION_MARKER, '')
    .replace(/\n\n📦[\s\S]*/, '')
    .trim();

  return (
    <div className="max-w-md rounded-xl border border-emerald-500/30 bg-emerald-50/80 px-4 py-3 text-sm text-gray-800">
      <p className="text-center leading-snug">{displayText}</p>
      {product && (
        <Link
          href={`/products/${product.id}`}
          className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#007782]/25 bg-white px-3 py-2 hover:bg-[#007782]/5"
        >
          <span className="font-semibold text-[#007782] truncate">{product.name}</span>
          <span className="shrink-0 font-bold tabular-nums">{formatPrice(product.price)}</span>
        </Link>
      )}
      <div className="mt-2 text-center text-[10px] text-gray-400">
        {new Date(createdAt).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

export function shouldUseSaleSystemCard(
  content: string,
  messageType?: string | null,
  productId?: string | null,
): boolean {
  return Boolean(productId && isSaleSystemMessage(content, messageType));
}
