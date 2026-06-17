'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { isBundleTransaction, resolveBundleDisplayItems, type BundleLineProduct } from '@/lib/bundleLineItems';

type Props = {
  transactionId: string;
  productId: string;
  bundleProductIds?: string | null;
  bundleItemCount?: number | null;
};

export default function BundleOrderLineItems({
  transactionId,
  productId,
  bundleProductIds,
  bundleItemCount,
}: Props) {
  const [items, setItems] = useState<BundleLineProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const isBundle = isBundleTransaction({ bundle_product_ids: bundleProductIds, bundle_item_count: bundleItemCount });

  useEffect(() => {
    if (!isBundle) {
      setLoading(false);
      return;
    }
    void resolveBundleDisplayItems(supabase, {
      id: transactionId,
      product_id: productId,
      bundle_product_ids: bundleProductIds,
    }).then((list) => {
      setItems(list);
      setLoading(false);
    });
  }, [transactionId, productId, bundleProductIds, bundleItemCount, isBundle]);

  if (!isBundle || loading) return null;
  if (items.length < 2) return null;

  const subtotal = items.reduce((s, i) => s + i.price, 0);

  return (
    <div className="mt-2 rounded-lg border border-[#007782]/15 bg-[#007782]/5 px-3 py-2">
      <p className="text-[10px] font-bold uppercase text-[#007782] flex items-center gap-1 mb-2">
        <Package size={12} />
        Csomag ({items.length} tétel)
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2 text-xs">
            <Link href={`/products/${item.id}`} className="truncate text-[#e7edf0] hover:text-[#007782] font-medium">
              {item.name}
            </Link>
            <span className="shrink-0 tabular-nums text-[#8fa3ad]">{formatPrice(item.price)}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-[#8fa3ad] mt-1.5 text-right tabular-nums">
        Részösszeg: {formatPrice(subtotal)}
      </p>
    </div>
  );
}
