'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, Package } from 'lucide-react';
import ShippingSelector, { type ShippingOption } from '@/components/product/ShippingSelector';
import CheckoutBuyerProtectionBanner from '@/components/checkout/CheckoutBuyerProtectionBanner';
import TrustSafetyBlock from '@/components/trust/TrustSafetyBlock';
import FoxpostTerminalPicker from '@/components/checkout/FoxpostTerminalPicker';
import PacketaPointPicker from '@/components/checkout/PacketaPointPicker';
import CheckoutTermsCheckbox from '@/components/checkout/CheckoutTermsCheckbox';
import CheckoutWalletOption from '@/components/checkout/CheckoutWalletOption';
import { calculateCheckoutTotal } from '@/lib/buyerProtection';
import type { FoxpostTerminal } from '@/lib/foxpostTerminal';
import type { PacketaPoint } from '@/lib/packetaPoint';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';
import { mapCheckoutApiError } from '@/lib/checkoutApiErrors';
import {
  clearBundleCart,
  computeBundleTotals,
  getBundleCart,
  type BundleCartItem,
} from '@/lib/sellerBundleCart';
import { fetchSellerBundleDiscountSettings } from '@/lib/bundleDiscount';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

export default function CheckoutBundleContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BundleCartItem[]>([]);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [shippingMethod, setShippingMethod] = useState('');
  const [foxpostTerminal, setFoxpostTerminal] = useState<FoxpostTerminal | null>(null);
  const [packetaPoint, setPacketaPoint] = useState<PacketaPoint | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    })();
  }, []);

  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const currency = t('common.currencyHuf');

  useEffect(() => {
    const cart = getBundleCart();
    if (!cart || cart.items.length < 2) {
      toast.error(t('checkout.bundle.needTwoItems'));
      router.push('/browse');
      return;
    }
    setItems(cart.items);
    setSellerId(cart.sellerId);
    void fetchSellerBundleDiscountSettings(supabase, cart.sellerId).then((settings) => {
      const totals = computeBundleTotals(cart.items, settings);
      setDiscountPercent(totals.discountPercent);
      setLoading(false);
    });
  }, [router, t]);

  useEffect(() => {
    if (shippingMethod !== 'foxpost') setFoxpostTerminal(null);
    if (shippingMethod !== 'packeta') setPacketaPoint(null);
  }, [shippingMethod]);

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

  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const discountedSubtotal = Math.round(subtotal * (1 - discountPercent / 100));
  const shippingCost = shippingOptions.find((s) => s.value === shippingMethod)?.cost || 0;
  const { buyerProtectionFee, total } = calculateCheckoutTotal(discountedSubtotal, shippingCost);
  const savings = subtotal - discountedSubtotal;

  const formatMoney = (n: number) => `${n.toLocaleString(locale)} ${currency}`;

  const processPayment = async () => {
    try {
      setProcessingPayment(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      if (shippingMethod === 'foxpost' && !foxpostTerminal) {
        toast.error(t('checkout.errors.foxpostRequired'));
        setProcessingPayment(false);
        return;
      }
      if (shippingMethod === 'packeta' && !packetaPoint) {
        toast.error(t('checkout.errors.packetaRequired'));
        setProcessingPayment(false);
        return;
      }

      if (!termsAccepted) {
        toast.error(t('checkout.terms.required'));
        setProcessingPayment(false);
        return;
      }

      const productIds = items.map((i) => i.productId);
      const sharedShipping = {
        foxpostTerminal: shippingMethod === 'foxpost' ? foxpostTerminal : null,
        packetaPoint: shippingMethod === 'packeta' ? packetaPoint : null,
      };

      if (useWallet) {
        const walletRes = await fetch('/api/checkout/wallet-pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productIds,
            buyerId: user.id,
            shippingMethod,
            shippingCost,
            bundleDiscountPercent: discountPercent,
            useWallet: true,
            termsAccepted: true,
            ...sharedShipping,
          }),
        });
        const walletData = await walletRes.json();
        if (!walletRes.ok) {
          throw new Error(walletData.error || t('checkout.errors.paymentFailed'));
        }

        if (walletData.mode === 'wallet' && walletData.successUrl) {
          clearBundleCart();
          window.location.href = walletData.successUrl;
          return;
        }
        if (walletData.mode === 'mixed' && walletData.url) {
          clearBundleCart();
          window.location.href = walletData.url;
          return;
        }
        // Else: stripe_only — fall through to Stripe checkout
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds,
          buyerId: user.id,
          shippingMethod,
          shippingCost,
          bundleDiscountPercent: discountPercent,
          termsAccepted: true,
          ...sharedShipping,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(mapCheckoutApiError(data.error, t));
      }

      clearBundleCart();
      window.location.href = data.url;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('checkout.errors.paymentFailed');
      toast.error(msg);
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a2328] flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-[#007782] border-t-transparent rounded-full" />
      </div>
    );
  }

  const summaryBlock = (
    <>
      <h3 className="font-bold text-base mb-4">{t('checkout.bundle.summaryTitle')}</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[#8fa3ad]">{t('checkout.bundle.subtotal', { count: items.length })}</span>
          <span className="font-medium tabular-nums">{formatMoney(subtotal)}</span>
        </div>
        {discountPercent > 0 ? (
          <div className="flex justify-between text-[#007782]">
            <span>{t('checkout.bundle.discount', { percent: discountPercent })}</span>
            <span className="font-medium tabular-nums">−{formatMoney(savings)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span className="text-[#8fa3ad]">{t('checkout.protectionFee')}</span>
          <span className="font-medium tabular-nums">{formatMoney(buyerProtectionFee)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#8fa3ad]">{t('checkout.shippingFee')}</span>
          <span className="font-medium tabular-nums">{formatMoney(shippingCost)}</span>
        </div>
        <div className="border-t border-[#2a3941]" />
        <div className="flex justify-between font-bold">
          <span>{t('checkout.total')}</span>
          <span className="text-[#007782] text-lg tabular-nums">{formatMoney(total)}</span>
        </div>
      </div>
      {discountPercent > 0 ? (
        <p className="text-xs text-[#007782] mt-2">{t('checkout.bundle.hint')}</p>
      ) : null}
    </>
  );

  const canPay = Boolean(shippingMethod) && termsAccepted && !processingPayment;

  const payButton = (
    <div className="space-y-3">
      {!shippingMethod && !processingPayment ? (
        <p className="text-xs text-amber-300 text-center">{t('checkout.selectShipping')}</p>
      ) : null}
      {!termsAccepted && shippingMethod && !processingPayment ? (
        <p className="text-xs text-amber-300 text-center">{t('checkout.terms.required')}</p>
      ) : null}
      {userId ? (
        <CheckoutWalletOption
          buyerId={userId}
          useWallet={useWallet}
          onUseWalletChange={setUseWallet}
          total={total}
        />
      ) : null}
      <CheckoutTermsCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
      <button
        type="button"
        onClick={() => void processPayment()}
        disabled={!canPay}
        className="w-full btn-base btn-primary disabled:opacity-50 min-h-12"
      >
        {processingPayment ? t('checkout.redirecting') : t('checkout.payButton', { total: total.toLocaleString(locale) })}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1a2328] text-[#e7edf0]">
      <main className={`min-h-screen ${MAIN_TOP_PADDING} pb-44 lg:pb-16`}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4 pt-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-[#243038]"
              aria-label={t('checkout.back')}
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <Package size={20} className="text-[#007782]" />
              <h1 className="text-xl font-bold">{t('checkout.bundle.title')}</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-[#1a2328] border border-[#2a3941] rounded-xl p-4 space-y-3">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#1a2328] shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={getOptimizedImageUrl(item.imageUrl, 80, 80)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                      <p className="text-[#007782] font-bold text-sm">{formatPrice(item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#1a2328] border border-[#2a3941] rounded-xl p-4">
                <ShippingSelector
                  value={shippingMethod}
                  onChange={setShippingMethod}
                  options={shippingOptions}
                  locale={locale}
                />
                {shippingMethod === 'foxpost' ? (
                  <FoxpostTerminalPicker value={foxpostTerminal} onChange={setFoxpostTerminal} />
                ) : null}
                {shippingMethod === 'packeta' ? (
                  <PacketaPointPicker value={packetaPoint} onChange={setPacketaPoint} />
                ) : null}
              </div>

              <CheckoutBuyerProtectionBanner />
              <TrustSafetyBlock variant="full" />

              {sellerId ? (
                <p className="text-xs text-[#8fa3ad]">
                  <button
                    type="button"
                    className="text-[#007782] font-semibold hover:underline"
                    onClick={() => router.push(`/profile/${sellerId}/closet`)}
                  >
                    {t('checkout.bundle.addAnother')}
                  </button>
                </p>
              ) : null}

              <div className="lg:hidden bg-[#1a2328] border border-[#2a3941] rounded-xl p-4">
                {summaryBlock}
              </div>
            </div>

            <div className="lg:col-span-2 hidden lg:block">
              <div className="bg-[#1a2328] border border-[#2a3941] rounded-xl p-4 lg:sticky lg:top-20">
                {summaryBlock}
                <div className="mt-5">{payButton}</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[9990] border-t bg-[#11171a]/95 backdrop-blur-lg px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_32px_rgba(0,0,0,0.08)]">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-semibold">{t('checkout.total')}</span>
          <span className="text-lg font-bold text-[#007782] tabular-nums">{formatMoney(total)}</span>
        </div>
        {payButton}
      </div>
    </div>
  );
}
