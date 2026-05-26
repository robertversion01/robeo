'use client';

import { useEffect, useState, use, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { getOptimizedImageUrl, shouldLazyLoad } from '@/lib/imageUtils';
import { getValidProductImageUrls } from '@/lib/productImageValidation';
import ProductImage from '@/components/product/ProductImage';
import ProductFavoriteButton from '@/components/product/ProductFavoriteButton';
import ProductShareReportBar from '@/components/product/ProductShareReportBar';
import OfferModal from '@/components/product/OfferModal';
import SellerBundleHint from '@/components/product/SellerBundleHint';
import SellerClosetBundle from '@/components/product/SellerClosetBundle';
import SimilarProductsRail from '@/components/product/SimilarProductsRail';
import ProductStickyCta from '@/components/product/ProductStickyCta';
import PriceHistoryBadge from '@/components/product/PriceHistoryBadge';
import TrustSafetyBlock from '@/components/trust/TrustSafetyBlock';
import SellerTrustPanel from '@/components/profile/SellerTrustPanel';
import BundleOfferModal from '@/components/product/BundleOfferModal';
import type { Product } from '@/types';
import { canViewProductDetail, isListedProduct, isSoldListing } from '@/lib/listedProducts';
import { recordPriceSnapshot } from '@/lib/priceHistory';
import { MAIN_TOP_PADDING, MOBILE_PRODUCT_STICKY_CTA_PAD } from '@/lib/layoutTokens';
import { formatConditionLabel } from '@/lib/conditionI18n';

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [sellerProfile, setSellerProfile] = useState<{ full_name?: string | null; email?: string | null } | null>(null);
  // Modal States
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showBundleOfferModal, setShowBundleOfferModal] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [acceptedOffer, setAcceptedOffer] = useState<{ id: string; offered_price: number } | null>(null);
  const [failedGalleryUrls, setFailedGalleryUrls] = useState<Set<string>>(() => new Set());
  const router = useRouter();

  const markGalleryUrlFailed = useCallback((url: string) => {
    setFailedGalleryUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  const allProductImages = useMemo(
    () =>
      product
        ? getValidProductImageUrls({
            image_url: product.image_url,
            images: product.images || [],
          })
        : [],
    [product],
  );

  const productImages = useMemo(
    () => allProductImages.filter((url) => !failedGalleryUrls.has(url)),
    [allProductImages, failedGalleryUrls],
  );

  useEffect(() => {
    if (selectedImageIndex >= productImages.length && productImages.length > 0) {
      setSelectedImageIndex(0);
    }
  }, [productImages.length, selectedImageIndex]);

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

      const { data: { user } } = await supabase.auth.getUser();
      setViewerId(user?.id ?? null);

      if (!canViewProductDetail(data.status, user?.id ?? null, data.user_id)) {
        setProduct(null);
        return;
      }

      setProduct(data);
      if (isListedProduct(data.status)) {
        void recordPriceSnapshot(supabase, data.id, data.price);
      }
      setSelectedImageIndex(0);

      if (user?.id && isListedProduct(data.status)) {
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
      } else {
        setAcceptedOffer(null);
      }

      const { data: sellerData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', data.user_id)
        .maybeSingle();

      setSellerProfile((sellerData as { full_name?: string | null; email?: string | null }) || null);
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

      toast.success(t('product.messageSent'));
      setMessageText('');
      setShowMessageModal(false);
      router.push(`/messages?with=${product.user_id}`);
    } catch (error) {
      console.error(error);
      toast.error(t('product.messageError'));
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
      toast.error(t('product.offerOwnProduct'));
      return;
    }

    setShowOfferModal(true);
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
      <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-4">
        <h2 className="text-xl mb-4">{t('product.notFound')}</h2>
        <Link href="/browse" className="text-[#007782] hover:underline">{t('product.backToBrowse')}</Link>
      </div>
    );
  }

  if (productImages.length === 0) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-4">
        <h2 className="text-xl mb-2 text-center">{t('product.noImages')}</h2>
        <p className="text-gray-500 text-sm mb-4 text-center">{t('product.noImagesHint')}</p>
        <Link href="/browse" className="text-[#007782] hover:underline">{t('product.backToBrowse')}</Link>
      </div>
    );
  }

  const categoryKey = product.category || 'other';
  const categoryBrowseHref = `/browse?cat=${encodeURIComponent(categoryKey)}#catalog`;
  const categoryLabel = t(`browse.categories.${categoryKey}`, { defaultValue: product.category });

  const safeSelectedIndex = Math.min(selectedImageIndex, productImages.length - 1);
  const activeImage = productImages[safeSelectedIndex];

  const sellerDisplayName = sellerProfile?.full_name || sellerProfile?.email?.split('@')[0] || t('product.seller');
  const sellerInitial = sellerDisplayName?.charAt(0).toUpperCase() || 'E';
  const isSold = isSoldListing(product.status);
  const isPurchasable = isListedProduct(product.status);

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
      {viewerId && product?.user_id ? (
        <BundleOfferModal
          isOpen={showBundleOfferModal}
          onClose={() => setShowBundleOfferModal(false)}
          sellerId={product.user_id}
          buyerId={viewerId}
        />
      ) : null}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="card-base p-5 max-w-md w-full shadow-lg">
            <h2 className="text-xl font-bold mb-3 text-gray-900">{t('product.messageModalTitle')}</h2>
            <p className="text-gray-600 text-sm mb-4">{t('product.messageModalHint')}</p>
            
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t('product.messagePlaceholder')}
              rows={4}
              className="textarea-base resize-none mb-4 focus:outline-none focus:ring-1 focus:ring-[#007782]"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 btn-base btn-secondary"
              >
                {t('product.cancel')}
              </button>
              <button
                onClick={sendMessageToSeller}
                disabled={sendingMessage}
                className="flex-1 btn-base btn-primary disabled:opacity-50"
              >
                {sendingMessage ? t('product.sending') : t('product.send')}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={`${MAIN_TOP_PADDING} px-0 md:px-6 ${MOBILE_PRODUCT_STICKY_CTA_PAD}`}>
        <Link href="/browse" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-3 transition-colors px-3 md:px-0 md:mb-6">
          ← {t('product.backToBrowse')}
        </Link>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-10">
            {/* Product Image Gallery */}
            <div>
              {/* Main Image */}
              <div
                className="relative aspect-square md:rounded-xl md:overflow-hidden bg-[#0f1a1d]/5 mb-2 border border-gray-200 touch-pan-y"
                onTouchStart={handleImageTouchStart}
                onTouchEnd={handleImageTouchEnd}
              >
                <ProductImage
                  src={getOptimizedImageUrl(activeImage, 800, 90)}
                  alt={product.name}
                  loading="eager"
                  className={`w-full h-full object-cover transition-transform duration-300 ${isZoomed ? 'scale-150' : 'scale-100'} ${isSold ? 'opacity-70 grayscale' : ''}`}
                  onError={() => markGalleryUrlFailed(activeImage)}
                />
                {isSold ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="rounded-md bg-black/75 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                      {t('product.sold')}
                    </span>
                  </div>
                ) : null}
                <ProductShareReportBar
                  productId={product.id}
                  productName={product.name}
                  className="absolute top-3 left-3 z-10"
                />
                <ProductFavoriteButton
                  productId={product.id}
                  className="absolute top-3 right-3 z-10"
                />
                <button
                  type="button"
                  onClick={() => setIsZoomed((prev) => !prev)}
                  className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
                >
                  {isZoomed ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
                  {isZoomed ? t('product.zoomOut') : t('product.zoomIn')}
                </button>
              </div>

              {/* Thumbnail Gallery for additional images */}
              {productImages.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-2">
                  {productImages.map((imgUrl: string, index: number) => (
                    <button
                      key={imgUrl}
                      type="button"
                      onClick={() => {
                        setSelectedImageIndex(index);
                        setIsZoomed(false);
                      }}
                      className={`w-14 h-14 rounded-md overflow-hidden flex-shrink-0 border transition-all ${
                        safeSelectedIndex === index
                          ? 'border-accent opacity-100 shadow-sm'
                          : 'border-gray-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <ProductImage
                        src={getOptimizedImageUrl(imgUrl, 100, 80)}
                        alt=""
                        loading={shouldLazyLoad(index) ? 'lazy' : 'eager'}
                        className="h-full w-full object-cover"
                        onError={() => markGalleryUrlFailed(imgUrl)}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex flex-col p-3 md:p-0 pb-4 md:pb-0">
              <Link
                href={categoryBrowseHref}
                className="text-[#007782] text-xs uppercase tracking-wider mb-1 inline-block hover:underline"
              >
                {categoryLabel}
              </Link>
              
              <h1 className="text-xl md:text-2xl font-bold mb-2">{product.name}</h1>

              {isSold ? (
                <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-gray-900">{t('product.soldOwnerTitle')}</p>
                  <p className="text-xs text-gray-600 mt-1">{t('product.soldOwnerHint')}</p>
                  {viewerId === product.user_id ? (
                    <Link
                      href="/profile?tab=shop"
                      className="mt-2 inline-block text-xs font-semibold text-[#007782] hover:underline"
                    >
                      {t('product.soldOwnerBack')}
                    </Link>
                  ) : null}
                </div>
              ) : null}
              
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="text-[#007782] font-bold text-2xl">
                  {product.price.toLocaleString()} Ft
                </div>
                <PriceHistoryBadge productId={product.id} currentPrice={product.price} />
              </div>

              <SellerBundleHint sellerId={product.user_id} />
              <TrustSafetyBlock variant="compact" className="mb-3" />
              {isPurchasable && viewerId && viewerId !== product.user_id ? (
                <SellerClosetBundle
                  sellerId={product.user_id}
                  currentProductId={product.id}
                  onBundleOffer={() => setShowBundleOfferModal(true)}
                />
              ) : null}
              
              <div className="flex flex-wrap gap-2 mb-3">
                {product.brand && (
                  <div className="bg-gray-100 px-2 py-1 rounded-md text-xs">
                    <span className="text-gray-500">{t('product.brand')}:</span> {product.brand}
                  </div>
                )}
                {product.size && (
                  <div className="bg-gray-100 px-2 py-1 rounded-md text-xs">
                    <span className="text-gray-500">{t('product.size')}:</span> {product.size}
                  </div>
                )}
                {product.condition && (
                  <div className="bg-gray-100 px-2 py-1 rounded-md text-xs">
                    <span className="text-gray-500">{t('product.condition')}:</span>{' '}
                    {formatConditionLabel(t, product.condition)}
                  </div>
                )}
              </div>
              
              <div className="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-line">
                {product.description}
              </div>

              <SimilarProductsRail
                productId={product.id}
                category={product.category}
                brand={product.brand}
                size={product.size}
              />

              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center gap-3 mb-3">
                  <Link
                    href={`/profile/${product.user_id}`}
                    className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-90"
                  >
                    <div className="h-10 w-10 rounded-full bg-[#007782]/15 text-[#007782] flex items-center justify-center font-semibold shrink-0">
                      {sellerInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{sellerDisplayName}</p>
                      <p className="text-xs text-[#007782] font-medium">{t('product.viewSeller')}</p>
                    </div>
                  </Link>
                </div>
                <SellerTrustPanel sellerId={product.user_id} className="mb-2" />
                <TrustSafetyBlock variant="full" className="mt-2" />
                <Link
                  href={categoryBrowseHref}
                  className="mt-3 inline-block text-xs font-semibold text-[#007782] hover:underline"
                >
                  {t('product.browseCategory')} →
                </Link>
              </div>

              {isPurchasable && viewerId !== product.user_id ? (
                <ProductStickyCta
                  productId={product.id}
                  sellerId={product.user_id}
                  acceptedOffer={acceptedOffer}
                  onOffer={openOfferModal}
                  onMessage={() => {
                    setMessageText(t('product.messagePrefill', { name: product.name }));
                    setShowMessageModal(true);
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}