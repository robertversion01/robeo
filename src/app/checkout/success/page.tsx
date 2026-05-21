'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  isBundleTransaction,
  resolveBundleDisplayItems,
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
  const router = useRouter();

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
  const [reviewCompleted, setReviewCompleted] = useState(false);

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

    const fetchTransactionDetails = async () => {
      try {
        let query = supabase.from('transactions').select('*');
        if (sessionId) {
          query = query.eq('checkout_session_id', sessionId);
        } else if (transactionId) {
          query = query.eq('id', transactionId);
        }
        const { data: transactionData, error: transactionError } = await query.single();

        if (transactionError || !transactionData) {
          throw new Error(t('checkoutSuccess.notFound'));
        }

        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', transactionData.product_id)
          .single();

        if (productError || !productData) {
          throw new Error(t('checkoutSuccess.notFound'));
        }

        setTransaction({ ...transactionData, product: productData });
        setProduct(productData);

        if (isBundleTransaction(transactionData)) {
          const items = await resolveBundleDisplayItems(supabase, {
            id: transactionData.id as string,
            product_id: transactionData.product_id as string,
            bundle_product_ids: transactionData.bundle_product_ids as string | null,
          });
          setBundleItems(items);
        } else {
          setBundleItems([]);
        }

        try {
          await revalidateCatalog();
        } catch (revalidateErr) {
          console.warn('[checkout-success] revalidateCatalog failed', revalidateErr);
        }
        notifyCatalogUpdated();
        router.refresh();

        const salePayload = {
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

        if (!purchaseToastShown) {
          toast.success(t('checkoutSuccess.toastSuccess'));
          setPurchaseToastShown(true);
        }
      } catch (err: unknown) {
        console.error('Error fetching transaction details:', err);
        const message = err instanceof Error ? err.message : t('auth.errors.generic');
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchTransactionDetails();
  }, [searchParams, router, purchaseToastShown, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg p-6 shadow-lg border border-gray-200 text-center">
          <h1 className="text-xl font-bold mb-4">{t('checkoutSuccess.errorTitle')}</h1>
          <p className="text-gray-600 mb-6">{error}</p>
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
    <div className="min-h-screen bg-white text-gray-900">
      <main className={`${MAIN_TOP_PADDING} pb-10 px-4 md:px-6`}>
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-center mb-6">
              <CheckCircle className="text-green-500 mr-2" size={28} />
              <h1 className="text-xl font-bold">{t('checkoutSuccess.title')}</h1>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">{t('checkoutSuccess.purchasedItem')}</p>
              {bundleItems.length >= 2 ? (
                <div>
                  <p className="text-sm font-semibold text-[#007782] mb-2">
                    {t('checkoutSuccess.bundleTitle', { count: bundleItems.length })}
                  </p>
                  <ul className="space-y-2">
                    {bundleItems.map((item) => (
                      <li key={item.id} className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 shrink-0">
                          {item.image_url ? (
                            <img
                              src={getOptimizedImageUrl(item.image_url, 96, 96)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              📷
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm text-gray-900 truncate">{item.name}</h3>
                          <p className="text-accent font-bold text-sm">{formatPrice(item.price)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {transaction?.amount ? (
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      {t('checkout.total')}: {formatPrice(transaction.amount)}
                    </p>
                  ) : null}
                </div>
              ) : product ? (
                <div className="flex items-center">
                  <div className="w-16 h-16 rounded-md overflow-hidden mr-3 bg-gray-100 flex-shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        📷
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
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
                    <h3 className="font-medium text-gray-900">{t('checkoutSuccess.stepPaid')}</h3>
                    <p className="text-sm text-gray-600">{t('checkoutSuccess.stepPaidHint')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-gray-100 p-2 rounded-full mr-3">
                    <Package className="text-gray-500" size={18} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{t('checkoutSuccess.stepShip')}</h3>
                    <p className="text-sm text-gray-600">{t('checkoutSuccess.stepShipHint')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-gray-100 p-2 rounded-full mr-3">
                    <Truck className="text-gray-500" size={18} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{t('checkoutSuccess.stepDelivery')}</h3>
                    <p className="text-sm text-gray-600">{t('checkoutSuccess.stepDeliveryHint')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">{t('checkoutSuccess.trackHint')}</p>
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
