'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Truck, Package, CreditCard } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import ReviewForm from '@/components/review/ReviewForm';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';
import { revalidateCatalog } from '@/app/actions/revalidateCatalog';
import { notifyCatalogUpdated } from '@/lib/catalogRefresh';

const CheckoutSuccessContent = dynamic(() => Promise.resolve(CheckoutSuccessContentComponent), {
  ssr: false,
});

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessContent />;
}

function CheckoutSuccessContentComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [purchaseToastShown, setPurchaseToastShown] = useState(false);
  const [reviewCompleted, setReviewCompleted] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setError('Hiányzó tranzakció azonosító');
      setLoading(false);
      return;
    }

    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const fetchTransactionDetails = async () => {
      try {
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .select('*')
          .eq('checkout_session_id', sessionId)
          .single();

        if (transactionError || !transactionData) {
          throw new Error('Transaction not found');
        }

        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', transactionData.product_id)
          .single();

        if (productError || !productData) {
          throw new Error('Product not found for transaction');
        }

        setTransaction({ ...transactionData, product: productData });
        setProduct(productData);

        try {
          await revalidateCatalog();
        } catch (revalidateErr) {
          console.warn('[checkout-success] revalidateCatalog failed', revalidateErr);
        }
        notifyCatalogUpdated();
        router.refresh();

        if (!purchaseToastShown) {
          toast.success('Sikeres vásárlás! A rendelésed rögzítve lett.');
          setPurchaseToastShown(true);
        }
      } catch (err: unknown) {
        console.error('Error fetching transaction details:', err);
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchTransactionDetails();
  }, [searchParams, router, purchaseToastShown]);

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
          <h1 className="text-xl font-bold mb-4">Hiba történt</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center btn-base btn-primary"
            onClick={() => {
              notifyCatalogUpdated();
              router.refresh();
            }}
          >
            Vissza a főoldalra
          </Link>
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
              <h1 className="text-xl font-bold">Sikeres vásárlás!</h1>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Vásárolt termék:</p>
              {product && (
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
                    <p className="text-accent font-bold">{product.price.toLocaleString()} Ft</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Fizetési folyamat</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-green-100 p-2 rounded-full mr-3">
                    <CreditCard className="text-green-600" size={18} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Fizetés megtörtént</h3>
                    <p className="text-sm text-gray-600">
                      A pénz biztonságos letétben van, amíg a termék meg nem érkezik.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-gray-100 p-2 rounded-full mr-3">
                    <Package className="text-gray-500" size={18} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Termék feladása</h3>
                    <p className="text-sm text-gray-600">Az eladó hamarosan feladja a terméket.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-gray-100 p-2 rounded-full mr-3">
                    <Truck className="text-gray-500" size={18} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Szállítás</h3>
                    <p className="text-sm text-gray-600">A termék úton van hozzád.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                A vásárlás részleteit és a szállítás állapotát az üzenetekben követheted nyomon.
              </p>
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
                  Üzenetek megtekintése
                  <ArrowRight size={16} className="ml-1" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center btn-base btn-secondary"
                  onClick={() => {
                    notifyCatalogUpdated();
                    router.refresh();
                  }}
                >
                  Vissza a főoldalra
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
