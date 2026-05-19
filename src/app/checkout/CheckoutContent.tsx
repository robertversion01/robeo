'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import ShippingSelector, { SHIPPING_OPTIONS } from '@/components/product/ShippingSelector';
import FoxpostTerminalPicker from '@/components/checkout/FoxpostTerminalPicker';
import { buyerProtectionFeeLabel, calculateCheckoutTotal } from '@/lib/buyerProtection';
import {
  applyBundleDiscountToPrice,
  bundleDiscountPercentForCount,
  parseBundleTiers,
} from '@/lib/bundleDiscount';
import type { FoxpostTerminal } from '@/lib/foxpostTerminal';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

export default function CheckoutContent() {
  const supabaseClient = supabase as any;
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [shippingMethod, setShippingMethod] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [validatingCheckout, setValidatingCheckout] = useState(false);
  const [isDirectPurchase, setIsDirectPurchase] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerId = searchParams.get('offer');
  const productId = searchParams.get('id');
  const [amount, setAmount] = useState(0);
  const [walletAvailable, setWalletAvailable] = useState(0);
  const [useWallet, setUseWallet] = useState(true);
  const [foxpostTerminal, setFoxpostTerminal] = useState<FoxpostTerminal | null>(null);
  const [bundleItemCount, setBundleItemCount] = useState(1);
  const [bundleDiscountPercent, setBundleDiscountPercent] = useState(0);
  const [sellerBundleEnabled, setSellerBundleEnabled] = useState(false);

  useEffect(() => {
    if (!offerId && !productId) {
      router.push('/');
      return;
    }
    if (offerId) {
      loadOffer();
    } else if (productId) {
      loadProduct();
    }
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
      console.error('[checkout-ui] Offer query failed', {
        offerId,
        buyerId: user.id,
        offerError,
      });
      toast.error('Az ajánlat nem található vagy már nem elérhető.');
      router.push('/');
      return;
    }

    if ((offerData as { status?: string }).status !== 'accepted') {
      toast.error(
        'Csak elfogadott ajánlattal lehet fizetni. Ha ellenajánlatot kaptál, előbb fogadd el a profilodon.'
      );
      router.push('/profile');
      return;
    }

    const { data: productDataRaw, error: productError } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', offerData.product_id)
      .single();

    const productData = productDataRaw as any;

    if (productError || !productData) {
      console.error('[checkout-ui] Product for offer is missing', {
        offerId,
        offerProductId: offerData.product_id,
        productError,
      });
      toast.error('Az ajánlathoz tartozó termék már nem található.');
      router.push('/');
      return;
    }

    setOffer(offerData);
    setProduct(productData);
    setAmount(offerData.offered_price);
    await loadSellerBundleAndWallet(productData.user_id, user.id);
    setLoading(false);
  };

  const loadSellerBundleAndWallet = async (
    sellerId: string,
    buyerId: string,
    itemCount = bundleItemCount,
  ) => {
    const [{ data: wallet }, { data: sellerProfile }] = await Promise.all([
      supabaseClient.from('wallets').select('available_balance').eq('user_id', buyerId).maybeSingle(),
      supabaseClient
        .from('profiles')
        .select('bundle_discount_enabled, bundle_discount_tiers')
        .eq('id', sellerId)
        .maybeSingle(),
    ]);
    setWalletAvailable(Math.max(0, Math.round(wallet?.available_balance || 0)));
    const enabled = Boolean(sellerProfile?.bundle_discount_enabled);
    setSellerBundleEnabled(enabled);
    if (enabled) {
      const tiers = parseBundleTiers(sellerProfile?.bundle_discount_tiers);
      setBundleDiscountPercent(bundleDiscountPercentForCount(tiers, itemCount));
    } else {
      setBundleDiscountPercent(0);
    }
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

    const productData = productDataRaw as any;

    if (productError || !productData) {
      console.error('[checkout-ui] Product query failed', {
        productId,
        productError,
      });
      toast.error('A termék nem található vagy már nem elérhető.');
      router.push('/');
      return;
    }

    if (productData.user_id === user.id) {
      toast.error('A saját termékedet nem vásárolhatod meg.');
      router.push(`/products/${productId}`);
      return;
    }

    setIsDirectPurchase(true);
    setProduct(productData);
    setAmount(productData.price);
    await loadSellerBundleAndWallet(productData.user_id, user.id);
    setLoading(false);
  };

  useEffect(() => {
    if (!product?.user_id) return;
    void supabaseClient.auth.getUser().then(({ data: { user } }) => {
      if (user) void loadSellerBundleAndWallet(product.user_id, user.id);
    });
  }, [bundleItemCount, product?.user_id]);

  const shippingCost = SHIPPING_OPTIONS.find((s) => s.value === shippingMethod)?.cost || 0;
  const discountedProductPrice =
    bundleDiscountPercent > 0 ? applyBundleDiscountToPrice(amount, bundleDiscountPercent) : amount;
  const { buyerProtectionFee, total } = calculateCheckoutTotal(discountedProductPrice, shippingCost);
  const walletCovers = useWallet ? Math.min(walletAvailable, total) : 0;
  const payWithCard = Math.max(0, total - walletCovers);

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
        console.error('[checkout-ui] Missing payment identifiers', {
          offerId,
          productIdFromUrl: productId,
          productIdFromState: product?.id,
          buyerId: user.id,
        });
        throw new Error('Hiányzó azonosítók: nem található termék vagy ajánlat.');
      }

      // Save shipping method to the offer if applicable
      if (offerId) {
        await supabaseClient
          .from('offers')
          .update({
            shipping_method: shippingMethod,
            shipping_cost: shippingCost
          })
          .eq('id', offerId);
      }

      // Call our Stripe checkout API
      if (shippingMethod === 'foxpost' && !foxpostTerminal) {
        throw new Error('Válassz Foxpost automatát a térképen!');
      }

      const checkoutPayload = {
        productId: effectiveProductId,
        offerId,
        buyerId: user.id,
        shippingMethod,
        shippingCost,
        bundleItemCount,
        foxpostTerminal: shippingMethod === 'foxpost' ? foxpostTerminal : null,
        useWallet,
      };

      const walletRes = await fetch('/api/checkout/wallet-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload),
      });
      const walletData = await walletRes.json();

      if (walletRes.ok && walletData.mode === 'wallet' && walletData.successUrl) {
        window.location.href = walletData.successUrl;
        return;
      }

      if (walletRes.ok && walletData.mode === 'mixed' && walletData.url) {
        window.location.href = walletData.url;
        return;
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Hiba történt a fizetés során');
      }

      window.location.href = data.url;
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(`Hiba történt: ${error.message}`);
      setProcessingPayment(false);
    }
  };

  const runPrecheck = async () => {
    if (processingPayment) {
      toast.info('A fizetés feldolgozás alatt van, az előellenőrzés most le van tiltva.');
      return;
    }

    try {
      setValidatingCheckout(true);

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const payload = {
        productId: product?.id || productId,
        offerId,
        buyerId: user.id,
        shippingMethod,
        shippingCost,
      };

      console.log('[checkout-ui] Running precheck with payload', payload);

      const response = await fetch('/api/checkout/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        console.error('[checkout-ui] Precheck failed', {
          status: response.status,
          responseData: data,
          payload,
        });
        throw new Error(data?.error || 'Az előellenőrzés sikertelen.');
      }

      console.info('[checkout-ui] Precheck success', data);
      const totalHuf = data?.pricing?.totalHuf;
      toast.success(
        totalHuf != null
          ? `Előellenőrzés OK — végösszeg: ${Number(totalHuf).toLocaleString('hu-HU')} Ft`
          : 'Előellenőrzés sikeres: azonosítók és árazás rendben.',
      );
    } catch (error: any) {
      toast.error(`Előellenőrzés hiba: ${error?.message || 'Ismeretlen hiba'}`);
    } finally {
      setValidatingCheckout(false);
    }
  };

  const backUrl = isDirectPurchase ? `/products/${productId}` : '/messages';

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className={`min-h-screen ${MAIN_TOP_PADDING} pb-16`}>
        <div className="max-w-4xl mx-auto px-4">
          {/* Back button + Title */}
          <div className="flex items-center gap-3 mb-4 pt-3">
            <button onClick={() => router.push(backUrl)} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-bold">Fizetés</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column: Product + Shipping */}
            <div className="lg:col-span-3 space-y-6">
              {/* Product Summary - Vinted style card */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                    {product?.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">📷</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate text-gray-900">{product?.name}</h3>
                    <div className="text-gray-500 text-xs mt-1">
                      {product?.category === 'clothing' ? 'Ruházat' :
                       product?.category === 'shoes' ? 'Cipő' :
                       product?.category === 'accessories' ? 'Kiegészítők' : product?.category}
                    </div>
                    <div className="text-accent font-bold text-lg mt-1">{amount.toLocaleString('hu-HU')} Ft</div>
                    {isDirectPurchase && (
                      <div className="text-[10px] text-gray-400 mt-0.5">Közvetlen vásárlás</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Selection - Vinted radio card style */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <ShippingSelector
                  value={shippingMethod}
                  onChange={(v) => {
                    setShippingMethod(v);
                    if (v !== 'foxpost') setFoxpostTerminal(null);
                  }}
                />
                {shippingMethod === 'foxpost' ? (
                  <FoxpostTerminalPicker value={foxpostTerminal} onChange={setFoxpostTerminal} />
                ) : null}
              </div>

              {sellerBundleEnabled ? (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Csomag vásárlás (kedvezmény)
                  </label>
                  <select
                    value={bundleItemCount}
                    onChange={(e) => setBundleItemCount(Number(e.target.value))}
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} termék{n > 1 && bundleDiscountPercent > 0 ? ` (−${bundleDiscountPercent}%)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Buyer Protection Info */}
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 flex items-start gap-2">
                <ShieldCheck size={18} className="text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Vevővédelem</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    A vevővédelmi díj biztosítja, hogy ha a termék nem érkezik meg, 
                    vagy nem egyezik a leírással, teljes visszatérítést kapsz.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Price Summary - Vinted sticky sidebar */}
            <div className="lg:col-span-2 min-w-0">
              <div className="bg-white border border-gray-200 rounded-lg p-4 lg:sticky lg:top-20 w-full">
                <h3 className="font-bold text-base mb-4">Összegzés</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Termék ára</span>
                    <span className="font-medium text-gray-900">
                      {discountedProductPrice.toLocaleString('hu-HU')} Ft
                      {bundleDiscountPercent > 0 ? (
                        <span className="block text-[10px] text-emerald-600">
                          Csomagkedvezmény: −{bundleDiscountPercent}%
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600" title="280 Ft + 5% a termék árára (Vinted HU)">
                      Vevővédelem
                    </span>
                    <span className="font-medium text-gray-900 text-right">
                      {buyerProtectionFee.toLocaleString('hu-HU')} Ft
                      <span className="block text-[10px] text-gray-400 font-normal">
                        ({buyerProtectionFeeLabel(amount)})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Szállítási díj</span>
                    <span className="font-medium text-gray-900">
                      {shippingCost.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-900">Összesen</span>
                    <span className="text-accent text-lg">{total.toLocaleString('hu-HU')} Ft</span>
                  </div>
                </div>

                {/* Pay Button */}
                <button
                  onClick={runPrecheck}
                  disabled={validatingCheckout || processingPayment}
                  className="w-full btn-base btn-secondary mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validatingCheckout ? 'Ellenőrzés...' : 'Előellenőrzés (ID validátor)'}
                </button>
                <button
                  onClick={processPayment}
                  disabled={
                    !shippingMethod ||
                    processingPayment ||
                    (shippingMethod === 'foxpost' && !foxpostTerminal)
                  }
                  className="w-full btn-base btn-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingPayment ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Átirányítás...
                    </span>
                  ) : (
                    payWithCard > 0 && useWallet && walletCovers > 0
                      ? `Fizetés ${payWithCard.toLocaleString('hu-HU')} Ft (kártya)`
                      : `Fizetés ${total.toLocaleString('hu-HU')} Ft`
                  )}
                </button>

                <p className="text-[10px] text-gray-400 text-center mt-3">
                  A fizetés gombra kattintva elfogadod a vásárlási feltételeket.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}