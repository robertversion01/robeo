'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import ShippingSelector from '@/components/product/ShippingSelector';

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
      .select('id, product_id, offered_price, buyer_id')
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

    setIsDirectPurchase(true);
    setProduct(productData);
    setAmount(productData.price);
    setLoading(false);
  };

  const shippingOptions = [
    { value: 'foxpost', label: 'Foxpost automatába', cost: 1190 },
    { value: 'packeta', label: 'Packeta pontba', cost: 990 },
    { value: 'home', label: 'Házhozszállítás', cost: 1790 },
  ];

  const shippingCost = shippingOptions.find(s => s.value === shippingMethod)?.cost || 0;
  const fixedBuyerProtectionFee = 280;
  const variableBuyerProtectionFee = Math.round(amount * 0.05);
  const buyerProtectionFee = fixedBuyerProtectionFee + variableBuyerProtectionFee;
  const total = amount + buyerProtectionFee + shippingCost;

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
      const checkoutPayload = {
        productId: effectiveProductId,
        offerId,
        buyerId: user.id,
        shippingMethod,
        shippingCost
      };

      console.log('[checkout-ui] Sending checkout payload', checkoutPayload);

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[checkout-ui] Checkout API error', {
          status: response.status,
          responseData: data,
          checkoutPayload,
        });
        throw new Error(data.error || 'Hiba történt a fizetés során');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(`Hiba történt: ${error.message}`);
      setProcessingPayment(false);
    }
  };

  const runPrecheck = async () => {
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
      toast.success('Előellenőrzés sikeres: Offer/Product/Buyer ID rendben.');
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
      <main className="min-h-screen pt-14 pb-16">
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
                  onChange={setShippingMethod}
                />
              </div>

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
                      {amount.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Vevővédelmi díj ({fixedBuyerProtectionFee.toLocaleString('hu-HU')} Ft + {variableBuyerProtectionFee.toLocaleString('hu-HU')} Ft)
                    </span>
                    <span className="font-medium text-gray-900">
                      {buyerProtectionFee.toLocaleString('hu-HU')} Ft
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
                  disabled={!shippingMethod || processingPayment}
                  className="w-full btn-base btn-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingPayment ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Átirányítás...
                    </span>
                  ) : (
                    `Fizetés ${total.toLocaleString('hu-HU')} Ft`
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