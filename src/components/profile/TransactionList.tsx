'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { toast } from 'sonner';
import { CheckCircle, Truck, Package, Clock, AlertCircle, CreditCard, Undo2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ReviewForm from '@/components/review/ReviewForm';
import { notifyTransactionStatusBothParties } from '@/lib/shippingNotifications';
import {
  SHIPPING_SIMULATION_DELAY_MS,
  TX_STATUS,
  TX_STATUS_LABELS,
  canBuyerConfirmReceipt,
  canSellerMarkShipped,
  isTerminalStatus,
  sellerShowsWaitingHint,
} from '@/lib/transactionFlow';

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
  const [actingId, setActingId] = useState<string | null>(null);
  const [simulatingIds, setSimulatingIds] = useState<Set<string>>(new Set());
  const simulationTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map());
  const userIdRef = useRef<string | null>(null);

  const patchTransactionLocal = useCallback((transactionId: string, status: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, status, updated_at: new Date().toISOString() } : t)),
    );
  }, []);

  const updateStatusInDb = useCallback(async (transactionId: string, status: string) => {
    const { error } = await supabase
      .from('transactions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', transactionId);
    if (error) throw error;
  }, []);

  const clearSimulationTimers = useCallback((transactionId: string) => {
    const timers = simulationTimersRef.current.get(transactionId);
    if (timers) {
      timers.forEach((t) => clearTimeout(t));
      simulationTimersRef.current.delete(transactionId);
    }
    setSimulatingIds((prev) => {
      const next = new Set(prev);
      next.delete(transactionId);
      return next;
    });
  }, []);

  const scheduleShippingSimulation = useCallback(
    (transaction: Transaction, sellerId: string) => {
      clearSimulationTimers(transaction.id);
      setSimulatingIds((prev) => new Set(prev).add(transaction.id));

      const schedule = (delayMs: number, nextStatus: string) =>
        setTimeout(async () => {
          try {
            await updateStatusInDb(transaction.id, nextStatus);
            patchTransactionLocal(transaction.id, nextStatus);
            await notifyTransactionStatusBothParties(supabase, transaction, nextStatus);

            if (nextStatus === TX_STATUS.ATVETELRE_VAR) {
              clearSimulationTimers(transaction.id);
              toast.info('A csomag átvételre vár — a vevőnek kell megerősítenie.');
            }
          } catch (err) {
            console.error('[shipping-simulation]', err);
            clearSimulationTimers(transaction.id);
          }
        }, delayMs);

      const timers = [
        schedule(SHIPPING_SIMULATION_DELAY_MS, TX_STATUS.UTON),
        schedule(SHIPPING_SIMULATION_DELAY_MS * 2, TX_STATUS.ATVETELRE_VAR),
      ];
      simulationTimersRef.current.set(transaction.id, timers);
    },
    [clearSimulationTimers, patchTransactionLocal, updateStatusInDb],
  );

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      userIdRef.current = user.id;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq(activeTab === 'buying' ? 'buyer_id' : 'seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const baseTransactions = (data || []) as Transaction[];
      const productIds = Array.from(new Set(baseTransactions.map((item) => item.product_id).filter(Boolean)));
      const participantIds = Array.from(
        new Set(baseTransactions.flatMap((item) => [item.buyer_id, item.seller_id]).filter(Boolean)),
      );

      let productMap: Record<string, { id: string; name: string; image_url: string | null }> = {};
      let profileMap: Record<string, { id: string; email: string | null }> = {};

      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, image_url')
          .in('id', productIds);

        productMap = (productsData || []).reduce(
          (acc: Record<string, { id: string; name: string; image_url: string | null }>, item: { id: string; name: string; image_url: string | null }) => {
            acc[item.id] = item;
            return acc;
          },
          {},
        );
      }

      if (participantIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', participantIds);

        profileMap = (profilesData || []).reduce(
          (acc: Record<string, { id: string; email: string | null }>, item: { id: string; email: string | null }) => {
            acc[item.id] = item;
            return acc;
          },
          {},
        );
      }

      setTransactions(
        baseTransactions.map((item) => ({
          ...item,
          product: productMap[item.product_id],
          buyer_profile: profileMap[item.buyer_id],
          seller_profile: profileMap[item.seller_id],
        })),
      );
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    return () => {
      simulationTimersRef.current.forEach((timers) => timers.forEach((t) => clearTimeout(t)));
      simulationTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      const filterCol = activeTab === 'buying' ? 'buyer_id' : 'seller_id';

      channel = supabase
        .channel(`transactions-${user.id}-${activeTab}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `${filterCol}=eq.${user.id}`,
          },
          () => {
            void loadTransactions();
          },
        )
        .subscribe();
    };

    void setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeTab, loadTransactions]);

  const markPackageShipped = async (transaction: Transaction) => {
    setActingId(transaction.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.id !== transaction.seller_id) {
        toast.error('Csak az eladó jelölheti feladottnak a csomagot.');
        return;
      }

      await updateStatusInDb(transaction.id, TX_STATUS.FELADVA);
      patchTransactionLocal(transaction.id, TX_STATUS.FELADVA);
      await notifyTransactionStatusBothParties(supabase, transaction, TX_STATUS.FELADVA);

      toast.success('Csomag feladva — a szállítás automatikusan frissül.');
      scheduleShippingSimulation(transaction, user.id);
    } catch (error) {
      console.error('markPackageShipped:', error);
      toast.error('Nem sikerült frissíteni a státuszt.');
      clearSimulationTimers(transaction.id);
    } finally {
      setActingId(null);
    }
  };

  const confirmTransactionAndReleaseFunds = async (transaction: Transaction) => {
    setActingId(transaction.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.id !== transaction.buyer_id) {
        toast.error('Csak a vevő erősítheti meg az átvételt.');
        return;
      }

      if (!canBuyerConfirmReceipt(transaction.status)) {
        toast.error('A csomag még nem érkezett meg átvételre.');
        return;
      }

      const response = await fetch('/api/transactions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: transaction.id, buyerId: user.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Nem sikerült a tranzakció lezárása');
      }

      patchTransactionLocal(transaction.id, TX_STATUS.SIKERESEN_ATVEVE);
      await notifyTransactionStatusBothParties(supabase, transaction, TX_STATUS.SIKERESEN_ATVEVE);

      toast.success('Köszönjük! A pénz felszabadult az eladó számára.');
      void loadTransactions();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Hiba történt a lezárás során';
      console.error('confirmTransaction:', error);
      toast.error(msg);
    } finally {
      setActingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'payment_pending':
        return <Clock className="text-yellow-500" size={18} />;
      case 'payment_failed':
        return <AlertCircle className="text-red-500" size={18} />;
      case 'paid':
      case 'fizetve':
        return <CreditCard className="text-green-500" size={18} />;
      case 'feladva':
        return <Package className="text-blue-500" size={18} />;
      case 'uton':
        return <Truck className="text-indigo-500" size={18} />;
      case 'atvetelre_var':
        return <Package className="text-purple-500" size={18} />;
      case 'sikeresen_atveve':
      case 'completed':
        return <CheckCircle className="text-emerald-500" size={18} />;
      case 'refunded':
        return <Undo2 className="text-orange-500" size={18} />;
      default:
        return <Clock className="text-gray-500" size={18} />;
    }
  };

  const getStatusLabel = (status: string) => TX_STATUS_LABELS[status] ?? 'Ismeretlen';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payment_pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'payment_failed':
        return 'bg-red-100 text-red-800';
      case 'paid':
      case 'fizetve':
        return 'bg-green-100 text-green-800';
      case 'feladva':
        return 'bg-blue-100 text-blue-800';
      case 'uton':
        return 'bg-indigo-100 text-indigo-800';
      case 'atvetelre_var':
        return 'bg-purple-100 text-purple-800';
      case 'sikeresen_atveve':
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'refunded':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderActionArea = (transaction: Transaction) => {
    const isBuyer = activeTab === 'buying';
    const status = transaction.status;
    const busy = actingId === transaction.id;
    const simulating = simulatingIds.has(transaction.id);

    if (isTerminalStatus(status)) return null;

    if (isBuyer) {
      if (!canBuyerConfirmReceipt(status)) return null;
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => confirmTransactionAndReleaseFunds(transaction)}
          className="px-4 py-2 bg-[#007782] text-white text-sm font-semibold rounded-xl hover:bg-[#006670] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Minden rendben
        </button>
      );
    }

    if (canSellerMarkShipped(status)) {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => markPackageShipped(transaction)}
          className="px-4 py-2 bg-[#007782] text-white text-sm font-semibold rounded-xl hover:bg-[#006670] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
          Csomag feladva
        </button>
      );
    }

    if (sellerShowsWaitingHint(status) || simulating) {
      return (
        <p className="text-xs text-gray-500 text-right max-w-[200px] leading-snug">
          {simulating || status === TX_STATUS.FELADVA || status === TX_STATUS.UTON
            ? 'Futár szimuláció folyamatban…'
            : 'Várakozás a vevő megerősítésére — a pénz ezután érkezik.'}
        </p>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex border-b border-gray-200 mb-4">
        <button
          type="button"
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
          type="button"
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
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
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
            <div key={transaction.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                  {transaction.product?.image_url ? (
                    <img
                      src={getOptimizedImageUrl(transaction.product.image_url, 100, 80)}
                      alt={transaction.product?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">📷</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm truncate text-gray-900">
                      {transaction.product?.name}
                    </h3>
                    <span className="text-accent font-bold text-sm">{formatPrice(transaction.amount)}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <span>{new Date(transaction.created_at).toLocaleDateString('hu-HU')}</span>
                    <span>•</span>
                    <span>
                      {activeTab === 'buying'
                        ? `Eladó: ${transaction.seller_profile?.email || 'Ismeretlen'}`
                        : `Vevő: ${transaction.buyer_profile?.email || 'Ismeretlen'}`}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(transaction.status)}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(transaction.status)}`}
                      >
                        {getStatusLabel(transaction.status)}
                      </span>
                    </div>
                    {renderActionArea(transaction)}
                  </div>

                  {transaction.status === TX_STATUS.SIKERESEN_ATVEVE &&
                    !reviewedTransactions.has(transaction.id) && (
                      <div className="mt-3">
                        <ReviewForm
                          reviewedId={
                            activeTab === 'buying' ? transaction.seller_id : transaction.buyer_id
                          }
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
