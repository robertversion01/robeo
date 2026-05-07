'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import CustomSelect from '@/components/ui/CustomSelect';

const SHIPPING_OPTIONS = [
  { value: 'foxpost', label: 'Foxpost automatába', cost: 1190 },
  { value: 'packeta', label: 'Packeta pontba', cost: 990 },
  { value: 'home', label: 'Házhozszállítás', cost: 1790 },
];

function CheckoutContent() {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    const { data: offerData } = await supabase
      .from('offers')
      .select('*, product:products(*)')
      .eq('id', offerId)
      .eq('buyer_id', user.id)
      .single();

    if (!offerData) {
      router.push('/');
      return;
    }

    setOffer(offerData);
    setProduct(offerData.product);
    setAmount(offerData.offered_price);
    setLoading(false);
  };

  const loadProduct = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!productData) {
      router.push('/');
      return;
    }

    setIsDirectPurchase(true);
    setProduct(productData);
    setAmount(productData.price);
    setLoading(false);
  };

  const shippingCost = SHIPPING_OPTIONS.find(s => s.value === shippingMethod)?.cost || 0;
  const total = amount + shippingCost;

  const processPayment = async () => {
    setProcessingPayment(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mark product as sold
    await supabase
      .from('products')
      .update({ status: 'sold' })
      .eq('id', product.id);

    if (offerId) {
      // Update offer status
      await supabase
        .from('offers')
        .update({
          shipping_method: shippingMethod,
          shipping_cost: shippingCost,
          status: 'completed'
        })
        .eq('id', offerId);

      // Send system message for offer purchase
      await supabase
        .from('messages')
        .insert({
          sender_id: offer.buyer_id,
          receiver_id: offer.seller_id,
          content: `✅ FIZETÉS SIKERES! A tranzakció megtörtént. Szállítási mód: ${SHIPPING_OPTIONS.find(s => s.value === shippingMethod)?.label}`
        });
    }

    // Show toast instead of alert
    toast.success(`
✅ VÁSÁRLÁS SIKERES!

Termék: ${product.name}
Végösszeg: ${total.toLocaleString()} Ft
Szállítás: ${SHIPPING_OPTIONS.find(s => s.value === shippingMethod)?.label}

Köszönjük a vásárlást!
    `.trim());

    router.push('/profile');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white">
      <main className="min-h-screen pt-28 pb-16 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <h1 className="text-3xl font-bold mb-6 text-center">🛒 Fizetés</h1>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 space-y-6">
            
            {/* Product Summary */}
            <div className="flex gap-4 pb-4 border-b border-white/10">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                {product?.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{product?.name}</h3>
                <div className="text-accent font-bold text-xl">{amount.toLocaleString()} Ft</div>
                {isDirectPurchase && (
                  <div className="text-xs text-white/50 mt-1">Közvetlen vásárlás</div>
                )}
              </div>
            </div>

            {/* Shipping Selection */}
            <div>
              <label className="block mb-3 font-medium text-white/90">Szállítási mód</label>
              <CustomSelect
                options={SHIPPING_OPTIONS.map(opt => ({
                  value: opt.value,
                  label: `${opt.label} - ${opt.cost} Ft`
                }))}
                value={shippingMethod}
                onChange={setShippingMethod}
                placeholder="Válassz szállítási módot"
              />
            </div>

            {/* Price Summary */}
            {shippingMethod && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex justify-between text-white/70">
                  <span>Termék ára</span>
                  <span>{amount.toLocaleString()} Ft</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Szállítási költség</span>
                  <span>{shippingCost.toLocaleString()} Ft</span>
                </div>
                <div className="flex justify-between font-bold text-xl text-accent pt-2 border-t border-white/10">
                  <span>Végösszeg</span>
                  <span>{total.toLocaleString()} Ft</span>
                </div>
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={processPayment}
              disabled={!shippingMethod || processingPayment}
              className="w-full py-4 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition-all duration-300 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processingPayment ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin">⏳</span> Fizetés folyamatban...
                </span>
              ) : (
                `💳 Fizetés ${total.toLocaleString()} Ft`
              )}
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}