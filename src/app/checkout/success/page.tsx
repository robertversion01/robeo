'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Truck, Package, CreditCard } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import ReviewForm from '@/components/review/ReviewForm';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';
import { revalidateCatalog } from '@/app/actions/revalidateCatalog';
import { notifyCatalogUpdated } from '@/lib/catalogRefresh';
import { emitSaleCompletedBroadcast } from '@/lib/globalEvents';
import { formatPrice } from '@/lib/utils';
import {
  type BundleLineProduct,
} from '@/lib/bundleLineItems';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

const CheckoutSuccessContent = dynamic(() => Promise.resolve(CheckoutSuccessContentComponent), {
  ssr: false,
});

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessContent />;
}

function CheckoutSuccessContentComponent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const goToHome = () => {
    notifyCatalogUpdated();
    window.location.href = '/';
  };
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [bundleItems, setBundleItems] = useState<BundleLineProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [purchaseToastShown, setPurchaseToastShown] = useState(false);
  const purchaseToastShownRef = useRef(false);
  const [reviewCompleted, setReviewCompleted] = useState(false);

  useEffect(() => {
    purchaseToastShownRef.current = purchaseToastShown;
  }, [purchaseToastShown]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const transactionId = searchParams.get('transaction_id');
    if (!sessionId && !transactionId) {
      setError(t('checkoutSuccess.missingId'));
      setLoading(false);
      return;
    }

    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchTransactionDetails = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          throw new Error('Jelentkezz be a folytatáshoz.');
        }

        const res = await fetch('/api/checkout/sync-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId: sessionId ?? undefined,
            transactionId: transactionId ?? undefined,
          }),
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error || t('checkoutSuccess.notFound'));
        }

        if (cancelled) return;

        const transactionData = payload.transaction;
        const productData = payload.product;
        setTransaction({ ...transactionData, product: productData });
        setProduct(productData);
        setBundleItems(payload.bundleItems ?? []);

        try {
          await revalidateCatalog();
        } catch (revalidateErr) {
          console.warn('[checkout-success] revalidateCatalog failed', revalidateErr);
        }
        notifyCatalogUpdated();

        const salePayload = payload.saleBroadcast ?? {
          sellerId: transactionData.seller_id as string,
          buyerId: transactionData.buyer_id as string,
          productId: productData.id as string,
          productName: (productData.name as string) || 'Termék',
          transactionId: transactionData.id as string,
        };

        try {
          await emitSaleCompletedBroadcast(supabase, salePayload);
        } catch (broadcastErr) {
          console.warn('[checkout-success] sale broadcast failed', broadcastErr);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('robeo:sale-broadcast', { detail: salePayload }),
          );
        }

        if (!purchaseToastShownRef.current) {
          toast.success(t('checkoutSuccess.toastSuccess'));
          purchaseToastShownRef.current = true;
          setPurchaseToastShown(true);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        console.error('Error fetching transaction details:', err);
        const message = err instanceof Error ? err.message : t('auth.errors.generic');
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchTransactionDetails();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a2328] text-[#e7edf0] flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a2328] text-[#e7edf0] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1a2328] rounded-lg p-6 shadow-lg border border-[#2a3941] text-center">
          <h1 className="text-xl font-bold mb-4">{t('checkoutSuccess.errorTitle')}</h1>
          <p className="text-[#8fa3ad] mb-6">{error}</p>
          <button
            type="button"
            onClick={goToHome}
            className="inline-flex items-center justify-center btn-base btn-primary"
          >
            {t('checkoutSuccess.backHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a2328] text-[#e7edf0]">
      <main className={`${MAIN_TOP_PADDING} pb-10 px-4 md:px-6`}>
        <div className="max-w-3xl mx-auto">
          <div className="bg-[#1a2328] rounded-lg p-6 shadow-lg border border-[#2a3941]">
            <div className="flex items-center justify-center mb-6">
              <CheckCircle className="text-green-500 mr-2" size={28} />
              <h1 className="text-xl font-bold">{t('checkoutSuccess.title')}</h1>
            </div>

            <div className="mb-6 p-4 bg-[#141d21] rounded-lg border border-[#2a3941]">
              <p className="text-sm text-[#8fa3ad] mb-1">{t('checkoutSuccess.purchasedItem')}</p>
              {bundleItems.length >= 2 ? (
                <div>
                  <p className="text-sm font-semibold text-[#007782] mb-2">
                    {t('checkoutSuccess.bundleTitle', { count: bundleItems.length })}
                  </p>
                  <ul className="space-y-2">
                    {bundleItems.map((item) => (
                      <li key={item.id} className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-[#1a2328] shrink-0">
                          {item.image_url ? (
                            <img
                              src={getOptimizedImageUrl(item.image_url, 96, 96)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#6b7d85] text-xs">
                              📷
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm text-[#e7edf0] truncate">{item.name}</h3>
                          <p className="text-accent font-bold text-sm">{formatPrice(item.price)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {transaction?.amount ? (
                    <p className="text-xs text-[#8fa3ad] mt-2 text-right">
                      {t('checkout.total')}: {formatPrice(transaction.amount)}
                    </p>
                  ) : null}
                </div>
              ) : product ? (
                <div className="flex items-center">
                  <div className="w-16 h-16 rounded-md overflow-hidden mr-3 bg-[#1a2328] flex-shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#6b7d85]">
                        📷
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-[#e7edf0]">{product.name}</h3>
                    <p className="text-accent font-bold">{formatPrice(product.price)}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">{t('checkoutSuccess.timelineTitle')}</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-green-100 p-2 rounded-full mr-3">
                    <CreditCard className="text-green-600" size={18} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#e7edf0]">{t('checkoutSuccess.stepPaid')}</h3>
                    <p className="text-sm text-[#8fa3ad]">{t('checkoutSuccess.stepPaidHint')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-[#1a2328] p-2 rounded-full mr-3">
                    <Package className="text-[#8fa3ad]" size={18} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#e7edf0]">{t('checkoutSuccess.stepShip')}</h3>
                    <p className="text-sm text-[#8fa3ad]">{t('checkoutSuccess.stepShipHint')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-[#1a2328] p-2 rounded-full mr-3">
                    <Truck className="text-[#8fa3ad]" size={18} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#e7edf0]">{t('checkoutSuccess.stepDelivery')}</h3>
                    <p className="text-sm text-[#8fa3ad]">{t('checkoutSuccess.stepDeliveryHint')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-[#8fa3ad]">{t('checkoutSuccess.trackHint')}</p>
              {transaction && product && !reviewCompleted ? (
                <div className="text-left">
                  <ReviewForm
                    reviewedId={transaction.seller_id}
                    productId={product.id}
                    sellerId={transaction.seller_id}
                    buyerId={transaction.buyer_id}
                    transactionId={transaction.id}
                    onComplete={() => setReviewCompleted(true)}
                  />
                </div>
              ) : null}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/messages"
                  className="inline-flex items-center justify-center btn-base btn-primary"
                >
                  {t('checkoutSuccess.viewMessages')}
                  <ArrowRight size={16} className="ml-1" />
                </Link>
                <button
                  type="button"
                  onClick={goToHome}
                  className="inline-flex items-center justify-center btn-base btn-secondary"
                >
                  {t('checkoutSuccess.backHome')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
