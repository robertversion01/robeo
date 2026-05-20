'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import ShippingSelector, { type ShippingOption } from '@/components/product/ShippingSelector';
import CheckoutBuyerProtectionBanner from '@/components/checkout/CheckoutBuyerProtectionBanner';
import { calculateCheckoutTotal } from '@/lib/buyerProtection';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

const CATEGORY_KEYS: Record<string, string> = {
  clothing: 'browse.categories.clothing',
  shoes: 'browse.categories.shoes',
  accessories: 'browse.categories.accessories',
  electronics: 'browse.categories.electronics',
  other: 'browse.categories.other',
};

export default function CheckoutContent() {
  const { t, i18n } = useTranslation();
  const supabaseClient = supabase as any;
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [shippingMethod, setShippingMethod] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isDirectPurchase, setIsDirectPurchase] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerId = searchParams.get('offer');
  const productId = searchParams.get('id');
  const [amount, setAmount] = useState(0);

  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const currency = t('common.currencyHuf');

  const shippingOptions: ShippingOption[] = useMemo(
    () => [
      {
        value: 'foxpost',
        label: t('checkout.shippingOptions.foxpost'),
        cost: 1190,
        days: t('checkout.shippingOptions.foxpostDays'),
        icon: 'foxpost',
      },
      {
        value: 'packeta',
        label: t('checkout.shippingOptions.packeta'),
        cost: 990,
        days: t('checkout.shippingOptions.packetaDays'),
        icon: 'packeta',
      },
      {
        value: 'home',
        label: t('checkout.shippingOptions.home'),
        cost: 1790,
        days: t('checkout.shippingOptions.homeDays'),
        icon: 'home',
      },
    ],
    [t],
  );

  useEffect(() => {
    if (!offerId && !productId) {
      router.push('/browse');
      return;
    }
    if (offerId) void loadOffer();
    else if (productId) void loadProduct();
  }, [offerId, productId]);

  const loadOffer = async () => {
    if (!offerId) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    const { data: offerDataRaw, error: offerError } = await supabaseClient
      .from('offers')
      .select('id, product_id, offered_price, buyer_id, status')
      .eq('id', offerId)
      .eq('buyer_id', user.id)
      .single();

    const offerData = offerDataRaw as any;

    if (offerError || !offerData) {
      toast.error(t('checkout.errors.offerNotFound'));
      router.push('/browse');
      return;
    }

    if ((offerData as { status?: string }).status !== 'accepted') {
      toast.error(t('checkout.errors.offerNotAccepted'));
      router.push('/profile');
      return;
    }

    const { data: productDataRaw, error: productError } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', offerData.product_id)
      .single();

    if (productError || !productDataRaw) {
      toast.error(t('checkout.errors.productMissing'));
      router.push('/browse');
      return;
    }

    setOffer(offerData);
    setProduct(productDataRaw);
    setAmount(offerData.offered_price);
    setLoading(false);
  };

  const loadProduct = async () => {
    if (!productId) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    const { data: productDataRaw, error: productError } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !productDataRaw) {
      toast.error(t('checkout.errors.productNotFound'));
      router.push('/browse');
      return;
    }

    if (productDataRaw.user_id === user.id) {
      toast.error(t('checkout.errors.ownProduct'));
      router.push(`/products/${productId}`);
      return;
    }

    setIsDirectPurchase(true);
    setProduct(productDataRaw);
    setAmount(productDataRaw.price);
    setLoading(false);
  };

  const shippingCost = shippingOptions.find((s) => s.value === shippingMethod)?.cost || 0;
  const { buyerProtectionFee, total } = calculateCheckoutTotal(amount, shippingCost);

  const processPayment = async () => {
    try {
      setProcessingPayment(true);

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const effectiveProductId = product?.id || productId;
      if (!effectiveProductId && !offerId) {
        throw new Error(t('checkout.errors.missingIds'));
      }

      if (offerId) {
        await supabaseClient
          .from('offers')
          .update({ shipping_method: shippingMethod, shipping_cost: shippingCost })
          .eq('id', offerId);
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: effectiveProductId,
          offerId,
          buyerId: user.id,
          shippingMethod,
          shippingCost,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('checkout.errors.paymentFailed'));
      }

      window.location.href = data.url;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('checkout.errors.paymentFailed');
      toast.error(msg);
      setProcessingPayment(false);
    }
  };

  const backUrl = isDirectPurchase ? `/products/${productId}` : '/messages';
  const categoryLabel = product?.category
    ? t(CATEGORY_KEYS[product.category] || 'browse.categories.other')
    : '';

  const formatMoney = (n: number) => `${n.toLocaleString(locale)} ${currency}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-[#007782] border-t-transparent rounded-full" />
      </div>
    );
  }

  const summaryBlock = (
    <>
      <h3 className="font-bold text-base mb-4">{t('checkout.summary')}</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">{t('checkout.itemPrice')}</span>
          <span className="font-medium text-gray-900 tabular-nums">{formatMoney(amount)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-600">{t('checkout.protectionFee')}</span>
          <span className="font-medium text-gray-900 tabular-nums text-right">
            {formatMoney(buyerProtectionFee)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{t('checkout.shippingFee')}</span>
          <span className="font-medium text-gray-900 tabular-nums">{formatMoney(shippingCost)}</span>
        </div>
        <div className="border-t border-gray-200" />
        <div className="flex justify-between font-bold">
          <span className="text-gray-900">{t('checkout.total')}</span>
          <span className="text-[#007782] text-lg tabular-nums">{formatMoney(total)}</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-3">{t('checkout.termsHint')}</p>
    </>
  );

  const payButton = (
    <div>
      {!shippingMethod && !processingPayment ? (
        <p className="text-xs text-amber-700 text-center mb-2">{t('checkout.selectShipping')}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void processPayment()}
        disabled={!shippingMethod || processingPayment}
        className="w-full btn-base btn-primary disabled:opacity-50 disabled:cursor-not-allowed min-h-12"
      >
        {processingPayment ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            {t('checkout.redirecting')}
          </span>
        ) : (
          t('checkout.payButton', { total: total.toLocaleString(locale) })
        )}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className={`min-h-screen ${MAIN_TOP_PADDING} pb-32 lg:pb-16`}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4 pt-3">
            <button
              type="button"
              onClick={() => router.push(backUrl)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700"
              aria-label={t('checkout.back')}
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-bold">{t('checkout.title')}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {product?.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate text-gray-900">{product?.name}</h3>
                    {categoryLabel ? (
                      <div className="text-gray-500 text-xs mt-1">{categoryLabel}</div>
                    ) : null}
                    <div className="text-[#007782] font-bold text-lg mt-1 tabular-nums">
                      {formatMoney(amount)}
                    </div>
                    {isDirectPurchase ? (
                      <div className="text-[10px] text-gray-400 mt-0.5">{t('checkout.directPurchase')}</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <ShippingSelector
                  value={shippingMethod}
                  onChange={setShippingMethod}
                  options={shippingOptions}
                  locale={locale}
                />
              </div>

              <CheckoutBuyerProtectionBanner />

              <div className="lg:hidden bg-white border border-gray-200 rounded-xl p-4">
                {summaryBlock}
              </div>
            </div>

            <div className="lg:col-span-2 min-w-0 hidden lg:block">
              <div className="bg-white border border-gray-200 rounded-xl p-4 lg:sticky lg:top-20 w-full">
                {summaryBlock}
                <div className="mt-5">{payButton}</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[9990] border-t border-gray-200 bg-white/95 backdrop-blur-lg px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_32px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-sm font-semibold text-gray-900">{t('checkout.total')}</span>
          <span className="text-lg font-bold text-[#007782] tabular-nums">{formatMoney(total)}</span>
        </div>
        {payButton}
      </div>
    </div>
  );
}
