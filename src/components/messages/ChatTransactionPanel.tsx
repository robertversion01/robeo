'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Package, Truck, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { hasFoxpostLabelDownloaded } from '@/lib/foxpostLabel';
import {
  canBuyerConfirmReceipt,
  canSellerMarkShipped,
  isPaidStatus,
  sellerShowsWaitingHint,
  TX_STATUS,
} from '@/lib/transactionFlow';
import { useTranslation } from 'react-i18next';
import { orderStatusI18nKey } from '@/lib/orderStatusI18n';
import { markPackageShipped, type ShippingTransaction } from '@/lib/sellerShipping';
import OrderTimelinePanel from '@/components/messages/OrderTimelinePanel';
import DisputePanel from '@/components/orders/DisputePanel';
import { focusOrderPanel, ORDER_PANEL_FOCUS_EVENT, ORDER_PANEL_PRINT_EVENT } from '@/lib/orderPanelActions';
import { printTransactionLabel } from '@/lib/printTransactionLabel';
import Link from 'next/link';
import { isSupabaseSchemaError, fetchTransactionWithColumnFallback, TX_CHAT_SELECT_SETS } from '@/lib/supabaseResilience';

function isAbortError(err: unknown): boolean {
  const message =
    err instanceof Error
      ? err.message
      : err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message ?? '')
        : '';
  return /abort/i.test(message);
}

function supabaseErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message?: unknown }).message ?? 'Unknown Supabase error');
  }
  return 'Unknown error';
}

type Props = {
  userId: string;
  otherUserId: string;
  productId: string | null;
  userEmail?: string | null;
};

type TxRow = ShippingTransaction & {
  productName?: string;
  tracking_number?: string | null;
  payment_intent_id?: string | null;
  dispute_status?: string | null;
  pickup_point_id?: string | null;
  pickup_point_name?: string | null;
  pickup_point_address?: string | null;
  pickup_provider?: string | null;
  foxpost_terminal_id?: string | null;
  foxpost_terminal_name?: string | null;
  foxpost_terminal_address?: string | null;
};

export default function ChatTransactionPanel({
  userId,
  otherUserId,
  productId,
  userEmail,
}: Props) {
  const { t } = useTranslation();
  const [transaction, setTransaction] = useState<TxRow | null>(null);
  const [offerStatus, setOfferStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [labelDownloaded, setLabelDownloaded] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const printHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const txStatusLabel = (status: string) => t(orderStatusI18nKey(status));

  const loadTransaction = useCallback(async (options?: { silent?: boolean }) => {
    if (!productId) {
      setTransaction(null);
      setOfferStatus(null);
      hasLoadedOnceRef.current = false;
      return;
    }
    const silent = options?.silent === true && hasLoadedOnceRef.current;
    if (!silent) setLoading(true);
    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, user_id')
        .eq('id', productId)
        .maybeSingle();

      if (productError) throw productError;

      const sellerId = product?.user_id ?? null;
      const participants = new Set([userId, otherUserId]);
      if (!sellerId || !participants.has(sellerId)) {
        setTransaction(null);
        setOfferStatus(null);
        return;
      }

      const buyerId = sellerId === userId ? otherUserId : userId;

      const txResult = await fetchTransactionWithColumnFallback<TxRow>(
        supabase,
        { productId, sellerId, buyerId },
        TX_CHAT_SELECT_SETS,
      );

      const offerRes = await supabase
        .from('offers')
        .select('status')
        .eq('product_id', productId)
        .eq('seller_id', sellerId)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (txResult.error) throw txResult.error;
      if (offerRes.error && !isSupabaseSchemaError(offerRes.error)) {
        console.warn('[ChatTransactionPanel] offer load failed', offerRes.error.message);
      }
      setOfferStatus(offerRes.data?.status ?? null);

      if (!txResult.data) {
        setTransaction(null);
        return;
      }

      setTransaction({
        ...txResult.data,
        productName: product?.name,
        product: { name: product?.name },
      });
      setLabelDownloaded(hasFoxpostLabelDownloaded(txResult.data.id));
      setSimulating(
        txResult.data.status === 'feladva' || txResult.data.status === 'uton' || txResult.data.status === 'atvetelre_var',
      );
    } catch (err) {
      if (isAbortError(err)) return;
      if (isSupabaseSchemaError(err as { code?: string; message?: string })) {
        setTransaction(null);
        return;
      }
      console.warn('[ChatTransactionPanel]', supabaseErrorMessage(err));
      setTransaction(null);
    } finally {
      if (!silent) setLoading(false);
      hasLoadedOnceRef.current = true;
    }
  }, [productId, userId, otherUserId]);

  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      void loadTransaction({ silent: true });
    }, 400);
  }, [loadTransaction]);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    void loadTransaction();
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, [loadTransaction]);

  useEffect(() => {
    if (!userId || !productId) return;

    const channel = supabase
      .channel(`chat-tx-${productId}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `product_id=eq.${productId}`,
        },
        () => {
          scheduleReload();
        },
      )
      .subscribe();

    const onSale = () => scheduleReload();
    const onTx = () => scheduleReload();
    const onFocus = () => {
      setHighlight(true);
      focusOrderPanel();
      window.setTimeout(() => setHighlight(false), 1800);
    };
    const onPrint = (event: Event) => {
      const detail = (event as CustomEvent<{ productId?: string | null; panelFound?: boolean }>).detail;
      if (detail?.productId && detail.productId !== productId) return;

      const attempt = (n: number) => {
        if (printHandlerRef.current) {
          void printHandlerRef.current();
          return;
        }
        if (n >= 8) {
          toast.info(t('chatTransaction.panelUnavailable'));
          return;
        }
        window.setTimeout(() => attempt(n + 1), 300);
      };
      attempt(0);
    };

    window.addEventListener('sale:completed', onSale);
    window.addEventListener('transaction:updated', onTx);
    window.addEventListener(ORDER_PANEL_FOCUS_EVENT, onFocus);
    window.addEventListener(ORDER_PANEL_PRINT_EVENT, onPrint);

    return () => {
      window.removeEventListener('sale:completed', onSale);
      window.removeEventListener('transaction:updated', onTx);
      window.removeEventListener(ORDER_PANEL_FOCUS_EVENT, onFocus);
      window.removeEventListener(ORDER_PANEL_PRINT_EVENT, onPrint);
      void supabase.removeChannel(channel);
    };
  }, [userId, productId, scheduleReload]);

  if (!productId) return null;

  const isSeller = transaction?.seller_id === userId;
  const isBuyer = transaction?.buyer_id === userId;
  const canDownloadLabel = Boolean(
    transaction &&
      isSeller &&
      (isPaidStatus(transaction.status) || transaction.status === TX_STATUS.FELADVA),
  );
  const canMarkShipped = Boolean(transaction && isSeller && canSellerMarkShipped(transaction.status));
  const canConfirmReceipt = Boolean(transaction && isBuyer && canBuyerConfirmReceipt(transaction.status));
  const statusLabel = transaction ? txStatusLabel(transaction.status) : t('orders.status.paymentPending');
  const hasDispute = Boolean(transaction?.dispute_status);
  const showPanel = loading || Boolean(transaction) || Boolean(offerStatus);

  if (!showPanel) return null;

  const handleConfirmReceipt = async () => {
    if (!transaction) return;
    setActing(true);
    try {
      const response = await fetch('/api/transactions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          buyerId: userId,
          paymentIntentId: transaction.payment_intent_id?.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t('chatTransaction.updateFailed'));

      setTransaction((prev) => (prev ? { ...prev, status: TX_STATUS.SIKERESEN_ATVEVE } : prev));
      toast.success(t('chatTransaction.confirmSuccess'));
      window.dispatchEvent(
        new CustomEvent('transaction:updated', { detail: { transactionId: transaction.id } }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('chatTransaction.updateFailed'));
    } finally {
      setActing(false);
    }
  };

  const handleLabelDownload = async () => {
    if (!transaction) {
      toast.error(t('chatTransaction.panelUnavailable'));
      return;
    }
    if (!canDownloadLabel) {
      toast.error(t('chatTransaction.downloadLabelFirst'));
      return;
    }
    setActing(true);
    try {
      const data = await printTransactionLabel(transaction.id, {
        userEmail,
        productNameFallback: transaction.productName || t('chatTransaction.defaultProduct'),
        productId,
        buyerId: transaction.buyer_id,
      });

      setTransaction((prev) =>
        prev
          ? {
              ...prev,
              status: data.status || 'feladva',
              tracking_number: data.trackingNumber ?? prev.tracking_number,
            }
          : prev,
      );
      setLabelDownloaded(true);
      if (data.status === 'feladva') {
        setSimulating(true);
      }
      toast.success(
        data.trackingNumber
          ? `${t('chatTransaction.labelDownloaded')} (${data.trackingNumber})`
          : t('chatTransaction.labelDownloaded'),
      );
      if (!data.openedPopup) {
        toast.info(t('chatTransaction.printPopupBlocked'));
      }
      window.dispatchEvent(
        new CustomEvent('transaction:updated', { detail: { transactionId: transaction.id } }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('chatTransaction.updateFailed'));
    } finally {
      setActing(false);
    }
  };

  printHandlerRef.current = handleLabelDownload;

  const handleMarkShipped = async () => {
    if (!transaction) return;
    if (!labelDownloaded) {
      toast.error(t('chatTransaction.downloadLabelFirst'));
      return;
    }
    setActing(true);
    try {
      await markPackageShipped(transaction, (_id, status) => {
        setTransaction((prev) => (prev ? { ...prev, status } : prev));
        if (status === 'feladva' || status === 'uton' || status === 'atvetelre_var') {
          setSimulating(true);
        }
      });
      toast.success(t('chatTransaction.shippedSuccess'));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t('chatTransaction.updateFailed'));
    } finally {
      setActing(false);
    }
  };

  return (
    <div
      id="chat-shipping-panel"
      className={`mx-4 mt-2 mb-1 rounded-xl border p-3 space-y-3 transition-shadow ${
        highlight
          ? 'border-[#007782] bg-[#007782]/10 ring-2 ring-[#007782]/30'
          : 'border-[#007782]/25 bg-[#007782]/5'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-800">
          <Package size={16} className="text-[#007782]" />
          <span>
            {t('chatTransaction.orderLabel')} <strong>{statusLabel}</strong>
          </span>
        </div>
        <Link href="/orders" className="text-[10px] font-semibold text-[#007782] hover:underline shrink-0">
          {t('orderTimeline.openOrders')} →
        </Link>
      </div>

      <OrderTimelinePanel
        compact
        context={{
          offerStatus,
          txStatus: transaction?.status ?? null,
          disputeStatus: transaction?.dispute_status ?? null,
        }}
        onStepClick={() => focusOrderPanel()}
      />

      {loading && !transaction ? (
        <p className="text-xs text-gray-500 animate-pulse">{t('common.loading')}</p>
      ) : null}

      {!loading && hasDispute && isSeller ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          {t('chatTransaction.disputeOpen')}
        </p>
      ) : null}

      {!loading && transaction && isBuyer ? (
        <DisputePanel
          transactionId={transaction.id}
          productName={transaction.productName}
          txStatus={transaction.status}
          disputeStatus={transaction.dispute_status ?? null}
        />
      ) : null}

      {!loading && isSeller && canDownloadLabel ? (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={acting}
              onClick={() => void handleLabelDownload()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#007782] bg-white px-3 min-h-11 py-2 text-sm font-semibold text-[#007782] hover:bg-[#007782]/5 touch-manipulation"
            >
              {acting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {t('chatTransaction.printLabel')}
            </button>
            {canMarkShipped ? (
              <button
                type="button"
                disabled={acting || !labelDownloaded}
                onClick={() => void handleMarkShipped()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#007782] px-3 min-h-11 py-2 text-sm font-semibold text-white hover:bg-[#006670] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {acting ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                {t('chatTransaction.markShipped')}
              </button>
            ) : null}
          </div>
          {canMarkShipped && !labelDownloaded ? (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
              {t('chatTransaction.stepHint')}
            </p>
          ) : null}
        </>
      ) : null}

      {!loading && isBuyer && canConfirmReceipt ? (
        <button
          type="button"
          disabled={acting}
          onClick={() => void handleConfirmReceipt()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#007782] px-3 py-2 text-xs font-semibold text-white"
        >
          {acting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          {t('chatTransaction.confirmReceipt')}
        </button>
      ) : null}

      {!loading && isBuyer && transaction && isPaidStatus(transaction.status) && !canConfirmReceipt ? (
        <p className="text-[11px] text-gray-600">{t('orderTimeline.buyerWaitingShip')}</p>
      ) : null}

      {!loading && isSeller && transaction && !canDownloadLabel && offerStatus === 'accepted' ? (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          {t('chatOffer.sellerWaitingBody')}
        </p>
      ) : null}

      {transaction?.tracking_number ? (
        <p className="text-[11px] font-mono text-[#007782] bg-white/80 rounded px-2 py-1">
          {t('chatTransaction.foxpostTracking', { tracking: transaction.tracking_number })}
        </p>
      ) : null}

      {transaction && (sellerShowsWaitingHint(transaction.status) || simulating) ? (
        <p className="text-[11px] text-gray-600">{t('chatTransaction.simulating')}</p>
      ) : null}
    </div>
  );
}
