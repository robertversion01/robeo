'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { toast } from 'sonner';
import { CheckCircle, Truck, Package, Clock, AlertCircle, CreditCard, Undo2 } from 'lucide-react';
import Link from 'next/link';
import ReviewForm from '@/components/review/ReviewForm';

interface Transaction {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  payment_intent_id: string;
  fee?: number;
  product?: {
    id: string;
    name: string;
    image_url: string | null;
  };
  buyer_profile?: {
    id: string;
    email: string | null;
  };
  seller_profile?: {
    id: string;
    email: string | null;
  };
}

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'buying' | 'selling'>('buying');
  const [reviewedTransactions, setReviewedTransactions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTransactions();
  }, [activeTab]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq(activeTab === 'buying' ? 'buyer_id' : 'seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const baseTransactions = (data || []) as Transaction[];
      const productIds = Array.from(
        new Set(baseTransactions.map((item) => item.product_id).filter(Boolean))
      );
      const participantIds = Array.from(
        new Set(
          baseTransactions
            .flatMap((item) => [item.buyer_id, item.seller_id])
            .filter(Boolean)
        )
      );

      let productMap: Record<string, { id: string; name: string; image_url: string | null }> = {};
      let profileMap: Record<string, { id: string; email: string | null }> = {};
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, image_url')
          .in('id', productIds);

        productMap = (productsData || []).reduce(
          (acc: Record<string, { id: string; name: string; image_url: string | null }>, item: any) => {
            acc[item.id] = item;
            return acc;
          },
          {}
        );
      }

      if (participantIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', participantIds);

        profileMap = (profilesData || []).reduce(
          (acc: Record<string, { id: string; email: string | null }>, item: any) => {
            acc[item.id] = item;
            return acc;
          },
          {}
        );
      }

      setTransactions(
        baseTransactions.map((item) => ({
          ...item,
          product: productMap[item.product_id],
          buyer_profile: profileMap[item.buyer_id],
          seller_profile: profileMap[item.seller_id],
        }))
      );
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTransactionStatus = async (transactionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', transactionId);

      if (error) throw error;

      // Update local state
      setTransactions(prev => 
        prev.map(t => t.id === transactionId ? { ...t, status: newStatus } : t)
      );

      // Send notification to the other party
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction) {
        const isBuyer = activeTab === 'buying';
        const senderId = isBuyer ? transaction.buyer_id : transaction.seller_id;
        const receiverId = isBuyer ? transaction.seller_id : transaction.buyer_id;
        
        let message = '';
        switch (newStatus) {
          case 'shipped':
            message = `📦 A termék feladásra került! "${transaction.product?.name || 'Termék'}" úton van hozzád.`;
            break;
          case 'delivered':
            message = `✅ A vevő megerősítette, hogy a "${transaction.product?.name || 'Termék'}" termék megérkezett!`;
            break;
          case 'completed':
            message = `💰 A tranzakció befejeződött! A "${transaction.product?.name || 'Termék'}" termék árát megkapta az eladó.`;
            break;
        }

        if (message) {
          await supabase
            .from('messages')
            .insert({
              sender_id: senderId,
              receiver_id: receiverId,
              content: message,
              product_id: transaction.product_id,
              message_type: 'system',
            });
        }
      }

      toast.success('Státusz sikeresen frissítve!');
    } catch (error) {
      console.error('Error updating transaction status:', error);
      toast.error('Hiba történt a státusz frissítése során');
    }
  };

  const confirmTransactionAndReleaseFunds = async (transactionId: string) => {
    try {
      const response = await fetch('/api/transactions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Nem sikerült a tranzakció lezárása');
      }

      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? { ...t, status: 'sikeresen_atveve' } : t))
      );
      toast.success('Tranzakció lezárva, pénz felszabadítva.');
    } catch (error: any) {
      console.error('Error confirming transaction:', error);
      toast.error(error.message || 'Hiba történt a lezárás során');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'payment_pending':
        return <Clock className="text-yellow-500" size={18} />;
      case 'payment_failed':
        return <AlertCircle className="text-red-500" size={18} />;
      case 'paid':
        return <CreditCard className="text-green-500" size={18} />;
      case 'shipped':
        return <Truck className="text-blue-500" size={18} />;
      case 'delivered':
        return <Package className="text-purple-500" size={18} />;
      case 'completed':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'fizetve':
        return <CreditCard className="text-green-500" size={18} />;
      case 'feladva':
        return <Truck className="text-blue-500" size={18} />;
      case 'uton':
        return <Truck className="text-indigo-500" size={18} />;
      case 'atvetelre_var':
        return <Package className="text-purple-500" size={18} />;
      case 'sikeresen_atveve':
        return <CheckCircle className="text-emerald-500" size={18} />;
      case 'refunded':
        return <Undo2 className="text-orange-500" size={18} />;
      default:
        return <Clock className="text-gray-500" size={18} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'payment_pending': return 'Fizetésre vár';
      case 'payment_failed': return 'Fizetés sikertelen';
      case 'paid': return 'Kifizetve';
      case 'shipped': return 'Feladva';
      case 'delivered': return 'Kézbesítve';
      case 'completed': return 'Befejezve';
      case 'fizetve': return 'Fizetve';
      case 'feladva': return 'Feladva';
      case 'uton': return 'Úton';
      case 'atvetelre_var': return 'Átvételre vár';
      case 'sikeresen_atveve': return 'Sikeresen átvéve';
      case 'refunded': return 'Visszatérítve';
      default: return 'Ismeretlen';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payment_pending': return 'bg-yellow-100 text-yellow-800';
      case 'payment_failed': return 'bg-red-100 text-red-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'fizetve': return 'bg-green-100 text-green-800';
      case 'feladva': return 'bg-blue-100 text-blue-800';
      case 'uton': return 'bg-indigo-100 text-indigo-800';
      case 'atvetelre_var': return 'bg-purple-100 text-purple-800';
      case 'sikeresen_atveve': return 'bg-emerald-100 text-emerald-800';
      case 'refunded': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderActionButton = (transaction: Transaction) => {
    const isBuyer = activeTab === 'buying';
    const status = transaction.status;

    if (isBuyer) {
      // Buyer actions
      if (status === 'feladva') {
        return (
          <button
            onClick={() => updateTransactionStatus(transaction.id, 'atvetelre_var')}
            className="px-3 py-1.5 bg-accent text-white text-xs rounded-lg hover:bg-accent/90 transition-colors"
          >
            Átvételre vár
          </button>
        );
      }

      if (status === 'atvetelre_var') {
        return (
          <button
            onClick={() => confirmTransactionAndReleaseFunds(transaction.id)}
            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
          >
            Minden rendben
          </button>
        );
      }
    } else {
      // Seller actions
      if (status === 'fizetve') {
        return (
          <button
            onClick={() => updateTransactionStatus(transaction.id, 'feladva')}
            className="px-3 py-1.5 bg-accent text-white text-xs rounded-lg hover:bg-accent/90 transition-colors"
          >
            Feladtam a terméket
          </button>
        );
      }

      if (status === 'feladva') {
        return (
          <button
            onClick={() => updateTransactionStatus(transaction.id, 'uton')}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
          >
            Úton
          </button>
        );
      }

      if (status === 'uton') {
        return (
          <button
            onClick={() => updateTransactionStatus(transaction.id, 'atvetelre_var')}
            className="px-3 py-1.5 bg-accent text-white text-xs rounded-lg hover:bg-accent/90 transition-colors"
          >
            Átvételre vár
          </button>
        );
      }
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('buying')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'buying'
              ? 'text-accent border-b-2 border-accent'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Vásárlásaim
        </button>
        <button
          onClick={() => setActiveTab('selling')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'selling'
              ? 'text-accent border-b-2 border-accent'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Eladásaim
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nincs még {activeTab === 'buying' ? 'vásárlásod' : 'eladásod'}.</p>
          {activeTab === 'buying' && (
            <Link href="/" className="text-accent hover:underline mt-2 inline-block">
              Böngéssz termékek között
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div 
              key={transaction.id} 
              className="bg-white border border-gray-200 rounded-lg p-3"
            >
              <div className="flex items-start gap-3">
                {/* Product Image */}
                <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                  {transaction.product?.image_url ? (
                    <img 
                      src={getOptimizedImageUrl(transaction.product.image_url, 100, 80)} 
                      alt={transaction.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">📷</div>
                  )}
                </div>
                
                {/* Transaction Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm truncate text-gray-900">
                      {transaction.product?.name}
                    </h3>
                    <span className="text-accent font-bold text-sm">
                      {formatPrice(transaction.amount)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <span>
                      {new Date(transaction.created_at).toLocaleDateString('hu-HU')}
                    </span>
                    <span>•</span>
                    <span>
                      {activeTab === 'buying' 
                        ? `Eladó: ${transaction.seller_profile?.email || 'Ismeretlen felhasználó'}` 
                        : `Vevő: ${transaction.buyer_profile?.email || 'Ismeretlen felhasználó'}`}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(transaction.status)}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(transaction.status)}`}>
                        {getStatusLabel(transaction.status)}
                      </span>
                    </div>
                    
                    {renderActionButton(transaction)}
                  </div>
                  {transaction.status === 'sikeresen_atveve' && !reviewedTransactions.has(transaction.id) && (
                    <div className="mt-3">
                      <ReviewForm
                        reviewedId={activeTab === 'buying' ? transaction.seller_id : transaction.buyer_id}
                        offerId={transaction.id}
                        transactionId={transaction.id}
                        onComplete={() =>
                          setReviewedTransactions((prev) => new Set(prev).add(transaction.id))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}