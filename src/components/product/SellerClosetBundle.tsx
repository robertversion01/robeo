'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Plus, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import {
  addToBundleCart,
  computeBundleTotals,
  getBundleCart,
  isInBundleCart,
  removeFromBundleCart,
  type BundleCartItem,
} from '@/lib/sellerBundleCart';
import {
  fetchSellerBundleDiscountSettings,
  type SellerBundleDiscountSettings,
} from '@/lib/bundleDiscount';
import type { Product } from '@/types';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

type Props = {
  sellerId: string;
  currentProductId: string;
  onBundleOffer?: () => void;
};

export default function SellerClosetBundle({ sellerId, currentProductId, onBundleOffer }: Props) {
  const { t } = useTranslation();
  const [closet, setCloset] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SellerBundleDiscountSettings | null>(null);
  const [cartRevision, setCartRevision] = useState(0);

  const refreshCart = () => setCartRevision((n) => n + 1);

  const load = useCallback(async () => {
    const [productsRes, bundleSettings] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('user_id', sellerId)
        .or('status.eq.active,status.is.null')
        .order('created_at', { ascending: false })
        .limit(12),
      fetchSellerBundleDiscountSettings(supabase, sellerId),
    ]);
    const list = ((productsRes.data || []) as Product[]).filter((p) => p.id !== currentProductId);
    setCloset(list.slice(0, 6));
    setSettings(bundleSettings);
  }, [sellerId, currentProductId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cart = getBundleCart();
  const cartItems =
    cart?.sellerId === sellerId ? cart.items : [];
  const totals =
    settings && cartItems.length > 0
      ? computeBundleTotals(cartItems, settings)
      : null;

  const toggleItem = (p: Product) => {
    const item: BundleCartItem = {
      productId: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.image_url,
    };
    if (isInBundleCart(p.id)) {
      removeFromBundleCart(p.id);
    } else {
      addToBundleCart(sellerId, item);
    }
    refreshCart();
  };

  if (closet.length === 0) return null;

  return (
    <section className="mb-4 rounded-xl border border-gray-200 bg-gray-50/80 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Package size={18} className="text-[#007782]" />
        <h3 className="text-sm font-semibold text-gray-900">{t('bundle.closet.title')}</h3>
      </div>
      <p className="text-xs text-gray-600 mb-3">{t('bundle.closet.hint')}</p>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {closet.map((p) => {
          const inCart = cartRevision >= 0 && isInBundleCart(p.id);
          return (
            <div
              key={p.id}
              className="shrink-0 w-[100px] rounded-lg border border-gray-200 bg-white overflow-hidden"
            >
              <Link href={`/products/${p.id}`} className="block aspect-[4/5] bg-gray-100">
                {p.image_url ? (
                  <img
                    src={getOptimizedImageUrl(p.image_url, 120, 80)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </Link>
              <div className="p-1.5">
                <p className="text-[10px] font-bold text-[#007782]">{formatPrice(p.price)}</p>
                <button
                  type="button"
                  onClick={() => toggleItem(p)}
                  className={`mt-1 w-full rounded-md py-1 text-[10px] font-semibold inline-flex items-center justify-center gap-0.5 ${
                    inCart
                      ? 'bg-[#007782]/10 text-[#007782]'
                      : 'bg-[#007782] text-white'
                  }`}
                >
                  {inCart ? <Check size={12} /> : <Plus size={12} />}
                  {inCart ? t('bundle.closet.added') : t('bundle.closet.add')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totals && cartItems.length >= 2 ? (
        <div className="mt-3 rounded-lg border border-[#007782]/20 bg-white px-3 py-2 text-xs">
          <p className="text-gray-700">
            {t('bundle.closet.summary', {
              count: cartItems.length,
              percent: totals.discountPercent,
              total: formatPrice(totals.total),
              savings: formatPrice(totals.savings),
            })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`/profile/${sellerId}`}
              className="inline-block font-semibold text-[#007782] hover:underline text-xs"
            >
              {t('bundle.closet.viewSeller')} →
            </Link>
            {onBundleOffer ? (
              <button
                type="button"
                onClick={onBundleOffer}
                className="rounded-full bg-[#007782] px-3 py-1 text-xs font-semibold text-white"
              >
                {t('bundle.offer.cta')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
