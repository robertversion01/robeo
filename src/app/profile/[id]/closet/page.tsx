'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Package, Plus, Check, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import {
  addToBundleCart,
  computeBundleTotals,
  getBundleCart,
  isInBundleCart,
  removeFromBundleCart,
  type BundleCartItem,
} from '@/lib/sellerBundleCart';
import { fetchSellerBundleDiscountSettings } from '@/lib/bundleDiscount';
import type { Product } from '@/types';
import SellerTrustPanel from '@/components/profile/SellerTrustPanel';
import PageHeader from '@/components/layout/PageHeader';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

export default function SellerClosetPage() {
  const params = useParams();
  const sellerId = String(params.id || '');
  const router = useRouter();
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [cartRevision, setCartRevision] = useState(0);
  const [settings, setSettings] = useState<Awaited<
    ReturnType<typeof fetchSellerBundleDiscountSettings>
  > | null>(null);

  const refreshCart = () => setCartRevision((n) => n + 1);

  const load = useCallback(async () => {
    const [productsRes, bundleSettings] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('user_id', sellerId)
        .or('status.eq.active,status.is.null')
        .order('created_at', { ascending: false })
        .limit(48),
      fetchSellerBundleDiscountSettings(supabase, sellerId),
    ]);
    setProducts((productsRes.data || []) as Product[]);
    setSettings(bundleSettings);
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) return;
    void load();
  }, [sellerId, load]);

  const cart = getBundleCart();
  const cartItems = cart?.sellerId === sellerId ? cart.items : [];
  const totals =
    settings && cartItems.length > 0 ? computeBundleTotals(cartItems, settings) : null;

  const toggleItem = (p: Product) => {
    const item: BundleCartItem = {
      productId: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.image_url,
    };
    if (isInBundleCart(p.id)) removeFromBundleCart(p.id);
    else addToBundleCart(sellerId, item);
    refreshCart();
  };

  return (
    <main
      className={`min-h-screen bg-white ${MAIN_TOP_PADDING} px-4`}
    >
      <div className="max-w-lg mx-auto">
        <PageHeader
          title={t('closet.pageTitle')}
          action={
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label={t('checkout.back')}
            >
              <ArrowLeft size={18} />
            </button>
          }
        />

        <p className="text-sm text-gray-600 mb-4">{t('closet.hint')}</p>
        <SellerTrustPanel sellerId={sellerId} className="mb-4" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((p) => {
            const inCart = cartRevision >= 0 && isInBundleCart(p.id);
            return (
              <div
                key={p.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <Link href={`/products/${p.id}`} className="block aspect-[4/5] bg-gray-100">
                  {p.image_url ? (
                    <img
                      src={getOptimizedImageUrl(p.image_url, 200, 250)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </Link>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-sm font-bold text-[#007782]">{formatPrice(p.price)}</p>
                  <button
                    type="button"
                    onClick={() => toggleItem(p)}
                    className={`mt-1.5 w-full rounded-lg py-1.5 text-xs font-semibold inline-flex items-center justify-center gap-1 ${
                      inCart ? 'bg-[#007782]/10 text-[#007782]' : 'bg-[#007782] text-white'
                    }`}
                  >
                    {inCart ? <Check size={14} /> : <Plus size={14} />}
                    {inCart ? t('bundle.closet.added') : t('bundle.closet.add')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {totals && cartItems.length >= 2 ? (
          <div className="fixed bottom-0 left-0 right-0 z-[9990] border-t bg-white/95 backdrop-blur-lg px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <div className="max-w-lg mx-auto flex items-center gap-3">
              <Package size={20} className="text-[#007782] shrink-0" />
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-semibold text-gray-900">
                  {t('bundle.closet.summary', {
                    count: cartItems.length,
                    percent: totals.discountPercent,
                    total: formatPrice(totals.total),
                    savings: formatPrice(totals.savings),
                  })}
                </p>
              </div>
              <Link
                href="/checkout?bundle=1"
                className="shrink-0 rounded-full bg-[#007782] px-4 py-2 text-xs font-semibold text-white"
              >
                {t('bundle.closet.checkout')}
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
