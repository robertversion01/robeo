'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Star, ZoomIn, ZoomOut } from 'lucide-react';
import { getOptimizedImageUrl, getProductImages, shouldLazyLoad } from '@/lib/imageUtils';
import { fetchSellerDisplayProfile, getSellerDisplayName } from '@/lib/sellerProfile';
import OfferModal from '@/components/product/OfferModal';
import type { Product } from '@/types';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [sellerDisplayName, setSellerDisplayName] = useState('Eladó');
  const [sellerReviewSummary, setSellerReviewSummary] = useState<{ avg: number; count: number }>({ avg: 5, count: 0 });
  
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
      setSelectedImageIndex(0);

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

      const sellerProfile = await fetchSellerDisplayProfile(supabase, data.user_id);
      setSellerDisplayName(getSellerDisplayName(sellerProfile));

      const { data: reviewData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', data.user_id);

      const ratings = (reviewData || []).map((entry: any) => Number(entry.rating)).filter(Boolean);
      const count = ratings.length;
      const avg = count > 0 ? ratings.reduce((sum, value) => sum + value, 0) / count : 5;
      setSellerReviewSummary({ avg, count });
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

  const openOfferModal = async () => {
    if (!product?.id || !product?.user_id) {
      toast.error('Hiányzó termék vagy eladó azonosító. Frissítsd az oldalt.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Ajánlat küldéséhez jelentkezz be.');
      router.push('/auth');
      return;
    }

    if (user.id === product.user_id) {
      toast.error('Nem tehetsz ajánlatot a saját termékedre.');
      return;
    }

    setShowOfferModal(true);
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
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center">
        <h2 className="text-xl mb-4">A termék nem található</h2>
        <Link href="/" className="text-accent hover:underline">Vissza a főoldalra</Link>
      </div>
    );
  }

  const productImages = getProductImages({
    image_url: product.image_url,
    images: product.images || [],
  });

  const sellerInitial = sellerDisplayName.charAt(0).toUpperCase() || 'E';
  const urgencySeed = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const isSold = product.status === 'sold';
  const inCartCount = 2 + (urgencySeed % 7);
  const showLastPiece = !isSold && urgencySeed % 2 === 0;

  const handleImageTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const handleImageTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || productImages.length <= 1) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const delta = touchStartX - endX;
    if (Math.abs(delta) < 35) return;
    if (delta > 0) {
      setSelectedImageIndex((prev) => (prev + 1) % productImages.length);
    } else {
      setSelectedImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">

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
          <div className="card-base p-5 max-w-md w-full shadow-lg">
            <h2 className="text-xl font-bold mb-3 text-gray-900">Üzenet az eladónak</h2>
            <p className="text-gray-600 text-sm mb-4">Írd meg mit szeretnél kérdezni a termékről!</p>
            
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Üzenet szövege..."
              rows={4}
              className="textarea-base resize-none mb-4 focus:outline-none focus:ring-1 focus:ring-[#007782]"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 btn-base btn-secondary"
              >
                Mégse
              </button>
              <button
                onClick={sendMessageToSeller}
                disabled={sendingMessage}
                className="flex-1 btn-base btn-primary disabled:opacity-50"
              >
                {sendingMessage ? 'Küldés...' : 'Üzenet küldése'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={`${MAIN_TOP_PADDING} pb-24 px-0 md:px-6`}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-10">
            {/* Product Image Gallery */}
            <div>
              {/* Main Image */}
              <div
                className="relative aspect-square md:rounded-xl md:overflow-hidden bg-gray-100 mb-2 border border-gray-200 touch-pan-y"
                onTouchStart={handleImageTouchStart}
                onTouchEnd={handleImageTouchEnd}
              >
                {productImages[selectedImageIndex] ? (
                  <img 
                    src={getOptimizedImageUrl(productImages[selectedImageIndex], 800, 90)} 
                    alt={product.name}
                    loading="eager"
                    className={`w-full h-full object-cover transition-transform duration-300 ${isZoomed ? 'scale-150' : 'scale-100'}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-5xl">
                    📷
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsZoomed((prev) => !prev)}
                  className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
                >
                  {isZoomed ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
                  {isZoomed ? 'Kicsinyítés' : 'Nagyítás'}
                </button>
              </div>

              {/* Thumbnail Gallery for additional images */}
              {productImages.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-2">
                  {productImages.map((imgUrl: string, index: number) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedImageIndex(index);
                        setIsZoomed(false);
                      }}
                      className={`w-14 h-14 rounded-md overflow-hidden flex-shrink-0 border transition-all ${
                        selectedImageIndex === index 
                          ? 'border-accent opacity-100 shadow-sm' 
                          : 'border-gray-200 opacity-70 hover:opacity-100'
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

              <div className="mb-3 space-y-1.5">
                {isSold ? (
                  <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-600 border border-gray-200">
                    Eladva
                  </div>
                ) : (
                  <>
                    <div className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                      Mar {inCartCount} ember kosaraban van
                    </div>
                    {showLastPiece ? (
                      <div className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                        Utolso darab ezen az aron!
                      </div>
                    ) : null}
                  </>
                )}
              </div>
              
              {/* Product Attributes */}
              <div className="flex flex-wrap gap-2 mb-3">
                {product.brand && (
                  <div className="bg-gray-100 px-2 py-1 rounded-md text-xs">
                    <span className="text-gray-500">Márka:</span> {product.brand}
                  </div>
                )}
                {product.size && (
                  <div className="bg-gray-100 px-2 py-1 rounded-md text-xs">
                    <span className="text-gray-500">Méret:</span> {product.size}
                  </div>
                )}
                {product.condition && (
                  <div className="bg-gray-100 px-2 py-1 rounded-md text-xs">
                    <span className="text-gray-500">Állapot:</span> {product.condition}
                  </div>
                )}
              </div>
              
              <div className="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-line">
                {product.description}
              </div>

              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#007782]/15 text-[#007782] flex items-center justify-center font-semibold">
                    {sellerInitial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{sellerDisplayName}</p>
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          size={12}
                          fill={idx < Math.round(sellerReviewSummary.avg) ? 'currentColor' : 'none'}
                        />
                      ))}
                      <span className="ml-1 text-xs text-gray-500">
                        {sellerReviewSummary.avg.toFixed(1)} ({sellerReviewSummary.count})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

               <div className="fixed bottom-0 left-0 right-0 md:static mt-auto p-2 md:p-0 md:mt-4 bg-white backdrop-blur-md border-t border-gray-200 md:border-t-0 md:bg-transparent md:backdrop-blur-none md:space-y-3 space-y-1.5 shadow-lg md:shadow-none">
                {isSold ? (
                  <button
                    type="button"
                    disabled
                    className="w-full min-h-11 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 font-semibold text-sm cursor-not-allowed"
                  >
                    Eladva
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) {
                          router.push('/auth');
                          return;
                        }
                        if (product.user_id === user.id) {
                          toast.error('A saját termékedet nem vásárolhatod meg.');
                          return;
                        }
                        router.push(
                          acceptedOffer
                            ? `/checkout?offer=${acceptedOffer.id}`
                            : `/checkout?id=${id}`,
                        );
                      }}
                      className="w-full btn-base btn-primary"
                    >
                      {acceptedOffer ? 'Vásárlás alkudott áron' : 'Vásárlás'}
                    </button>
                    <button
                      type="button"
                      onClick={openOfferModal}
                      className="w-full btn-base btn-secondary"
                    >
                      Ajánlatot teszek
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMessageText(`Szia! Erdeklodnek a ${product.name} irant.`);
                    setShowMessageModal(true);
                  }}
                  className="w-full btn-base btn-secondary"
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