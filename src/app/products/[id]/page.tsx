'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getOptimizedImageUrl, shouldLazyLoad } from '@/lib/imageUtils';
import OfferModal from '@/components/product/OfferModal';
import type { Product } from '@/types';

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Modal States
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [acceptedOffer, setAcceptedOffer] = useState<{ id: string; offered_price: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: acceptedOfferData } = await supabase
          .from('offers')
          .select('id, offered_price')
          .eq('product_id', id)
          .eq('buyer_id', user.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (acceptedOfferData) {
          setAcceptedOffer(acceptedOfferData as { id: string; offered_price: number });
        } else {
          setAcceptedOffer(null);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessageToSeller = async () => {
    if (!messageText.trim() || !product) return;
    
    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth');
        return;
      }

      await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: product.user_id,
          content: messageText,
          product_id: id
        });

      toast.success('✅ Üzenet elküldve az eladónak! A beszélgetésed az Üzenetek menüben található.');
      setMessageText('');
      setShowMessageModal(false);
    } catch (error) {
      console.error(error);
      toast.error('❌ Hiba történt az üzenet küldése során');
    } finally {
      setSendingMessage(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    clothing: 'Ruházat',
    shoes: 'Cipő',
    accessories: 'Kiegészítők',
    electronics: 'Elektronika',
    other: 'Egyéb'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-indigo-950 dark:to-black text-gray-900 dark:text-white flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-indigo-950 dark:to-black text-gray-900 dark:text-white flex flex-col items-center justify-center">
        <h2 className="text-xl mb-4">A termék nem található</h2>
        <Link href="/" className="text-accent hover:underline">Vissza a főoldalra</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-indigo-950 dark:to-black text-gray-900 dark:text-white">

      {/* Offer Modal */}
      <OfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        productId={product?.id || ''}
        sellerId={product?.user_id || ''}
        productTitle={product?.name || ''}
        originalPrice={product?.price || 0}
      />

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 max-w-md w-full shadow-lg">
            <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Üzenet az eladónak</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Írd meg mit szeretnél kérdezni a termékről!</p>
            
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Üzenet szövege..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none mb-4 text-sm"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-800 dark:text-white text-sm"
              >
                Mégse
              </button>
              <button
                onClick={sendMessageToSeller}
                disabled={sendingMessage}
                className="flex-1 py-2.5 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-all disabled:opacity-50 text-sm"
              >
                {sendingMessage ? 'Küldés...' : 'Üzenet küldése'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="pt-14 pb-24 px-0 md:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white mb-3 transition-colors px-3 md:px-0 md:mb-6">
          ← Vissza a főoldalra
        </Link>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-10">
            {/* Product Image Gallery */}
            <div>
              {/* Main Image */}
              <div className="aspect-square md:rounded-xl md:overflow-hidden bg-gray-100 dark:bg-white/5 mb-2 border border-gray-100 dark:border-white/10">
                {(product.images && product.images[selectedImageIndex]) || product.image_url ? (
                  <img 
                    src={getOptimizedImageUrl(((product.images && product.images[selectedImageIndex]) || product.image_url) ?? '', 800, 90)} 
                    alt={product.name}
                    loading="eager"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-white/30 text-5xl">
                    📷
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery for additional images */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-2">
                  {product.images.map((imgUrl: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`w-14 h-14 rounded-md overflow-hidden flex-shrink-0 border transition-all ${
                        selectedImageIndex === index 
                          ? 'border-accent opacity-100 shadow-sm' 
                          : 'border-gray-200 dark:border-white/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={getOptimizedImageUrl(imgUrl, 100, 80)} 
                        alt={`${product.name} ${index + 1}`}
                        loading={shouldLazyLoad(index) ? "lazy" : "eager"}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex flex-col p-3 md:p-0 pb-48">
              <div className="text-accent text-xs uppercase tracking-wider mb-1">
                {categoryLabels[product.category] || product.category}
              </div>
              
              <h1 className="text-xl md:text-2xl font-bold mb-2">{product.name}</h1>
              
              <div className="text-accent font-bold text-2xl mb-3">{product.price.toLocaleString()} Ft</div>
              
              {/* Product Attributes */}
              <div className="flex flex-wrap gap-2 mb-3">
                {product.brand && (
                  <div className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Márka:</span> {product.brand}
                  </div>
                )}
                {product.size && (
                  <div className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Méret:</span> {product.size}
                  </div>
                )}
                {product.condition && (
                  <div className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Állapot:</span> {product.condition}
                  </div>
                )}
              </div>
              
              <div className="text-gray-700 dark:text-white/70 text-sm leading-relaxed mb-4 whitespace-pre-line">
                {product.description}
              </div>

               <div className="fixed bottom-0 left-0 right-0 md:static mt-auto p-2 md:p-0 md:mt-4 bg-white dark:bg-black/80 backdrop-blur-md border-t border-gray-200 dark:border-white/10 md:border-t-0 md:bg-transparent md:backdrop-blur-none md:space-y-3 space-y-1.5 shadow-lg md:shadow-none">
                 <button 
                  onClick={() =>
                    acceptedOffer
                      ? router.push(`/checkout?offer=${acceptedOffer.id}`)
                      : router.push(`/checkout?id=${id}`)
                  }
                   className="w-full py-2.5 md:py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-all duration-300 text-sm"
                 >
                  {acceptedOffer ? 'Vásárlás alkudott áron' : 'Vásárlás'}
                 </button>
                  <button 
                    onClick={() => setShowOfferModal(true)}
                    className="w-full py-2.5 md:py-3 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-all duration-300 text-sm"
                  >
                    Ajánlatot teszek
                  </button>
                  <button 
                    onClick={() => setShowMessageModal(true)}
                    className="w-full py-2.5 md:py-3 border border-gray-300 dark:border-white/30 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 text-sm"
                  >
                    Üzenet az eladónak
                  </button>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}