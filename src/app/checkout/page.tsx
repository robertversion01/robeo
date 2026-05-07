'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import ShippingSelector from '@/components/product/ShippingSelector';
import PriceBreakdown, { calculateBuyerProtection } from '@/components/product/PriceBreakdown';

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

  const shippingOptions = [
    { value: 'foxpost', label: 'Foxpost automatába', cost: 1190 },
    { value: 'packeta', label: 'Packeta pontba', cost: 990 },
    { value: 'home', label: 'Házhozszállítás', cost: 1790 },
  ];

  const shippingCost = shippingOptions.find(s => s.value === shippingMethod)?.cost || 0;
  const total = amount + calculateBuyerProtection(amount) + shippingCost;

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
      await supabase
        .from('offers')
        .update({
          shipping_method: shippingMethod,
          shipping_cost: shippingCost,
          status: 'completed'
        })
        .eq('id', offerId);

      await supabase
        .from('messages')
        .insert({
          sender_id: offer.buyer_id,
          receiver_id: offer.seller_id,
          content: `✅ FIZETÉS SIKERES! A tranzakció megtörtént. Szállítási mód: ${shippingOptions.find(s => s.value === shippingMethod)?.label}`
        });
    }

    toast.success(`
✅ VÁSÁRLÁS SIKERES!

Termék: ${product.name}
Végösszeg: ${total.toLocaleString('hu-HU')} Ft
Szállítás: ${shippingOptions.find(s => s.value === shippingMethod)?.label}

Köszönjük a vásárlást!
    `.trim());

    router.push('/profile');
  };

  const backUrl = isDirectPurchase ? `/products/${productId}` : '/messages';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white">
      <main className="min-h-screen pt-16 pb-24">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back button + Title */}
          <div className="flex items-center gap-4 mb-8 pt-4">
            <button onClick={() => router.push(backUrl)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold">Fizetés</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column: Product + Shipping */}
            <div className="lg:col-span-3 space-y-6">
              {/* Product Summary - Vinted style card */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                    {product?.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">📷</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{product?.name}</h3>
                    <div className="text-white/50 text-sm mt-1">
                      {product?.category === 'clothing' ? 'Ruházat' :
                       product?.category === 'shoes' ? 'Cipő' :
                       product?.category === 'accessories' ? 'Kiegészítők' : product?.category}
                    </div>
                    <div className="text-accent font-bold text-xl mt-2">{amount.toLocaleString('hu-HU')} Ft</div>
                    {isDirectPurchase && (
                      <div className="text-[10px] text-white/40 mt-1">Közvetlen vásárlás</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Selection - Vinted radio card style */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
                <ShippingSelector
                  value={shippingMethod}
                  onChange={setShippingMethod}
                />
              </div>

              {/* Buyer Protection Info */}
              <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck size={20} className="text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Vevővédelem</p>
                  <p className="text-xs text-white/50 mt-1">
                    A vevővédelmi díj biztosítja, hogy ha a termék nem érkezik meg, 
                    vagy nem egyezik a leírással, teljes visszatérítést kapsz.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Price Summary - Vinted sticky sidebar */}
            <div className="lg:col-span-2">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 lg:sticky lg:top-24">
                <h3 className="font-bold text-lg mb-5">Összegzés</h3>
                
                <PriceBreakdown 
                  price={amount} 
                  shippingCost={shippingMethod ? shippingCost : undefined}
                />

                {/* Pay Button */}
                <button
                  onClick={processPayment}
                  disabled={!shippingMethod || processingPayment}
                  className="w-full py-4 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition-all duration-300 mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent text-base"
                >
                  {processingPayment ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                      Fizetés folyamatban...
                    </span>
                  ) : (
                    `Fizetés ${total.toLocaleString('hu-HU')} Ft`
                  )}
                </button>

                <p className="text-[10px] text-white/30 text-center mt-4">
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