'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Package, Truck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  downloadFoxpostLabel,
  hasFoxpostLabelDownloaded,
  markFoxpostLabelDownloaded,
} from '@/lib/foxpostLabel';
import {
  canSellerMarkShipped,
  isPaidStatus,
  sellerShowsWaitingHint,
} from '@/lib/transactionFlow';
import { useTranslation } from 'react-i18next';
import { orderStatusI18nKey } from '@/lib/orderStatusI18n';
import { markPackageShipped, type ShippingTransaction } from '@/lib/sellerShipping';

type Props = {
  userId: string;
  otherUserId: string;
  productId: string | null;
  userEmail?: string | null;
};

type TxRow = ShippingTransaction & {
  productName?: string;
  tracking_number?: string | null;
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

  const txStatusLabel = (status: string) => t(orderStatusI18nKey(status));
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [labelDownloaded, setLabelDownloaded] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const loadTransaction = useCallback(async () => {
    if (!productId) {
      setTransaction(null);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(
          'id, status, product_id, buyer_id, seller_id, tracking_number, foxpost_terminal_id, foxpost_terminal_name, foxpost_terminal_address',
        )
        .eq('product_id', productId)
        .or(
          `and(buyer_id.eq.${userId},seller_id.eq.${otherUserId}),and(buyer_id.eq.${otherUserId},seller_id.eq.${userId})`,
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setTransaction(null);
        return;
      }

      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', data.product_id)
        .maybeSingle();

      setTransaction({
        ...data,
        productName: product?.name,
        product: { name: product?.name },
      });
      setLabelDownloaded(hasFoxpostLabelDownloaded(data.id));
      setSimulating(
        data.status === 'feladva' || data.status === 'uton' || data.status === 'atvetelre_var',
      );
    } catch (err) {
      console.error('[ChatTransactionPanel]', err);
      setTransaction(null);
    } finally {
      setLoading(false);
    }
  }, [productId, userId, otherUserId]);

  useEffect(() => {
    void loadTransaction();
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
          void loadTransaction();
        },
      )
      .subscribe();

    const onSale = () => void loadTransaction();
    const onTx = () => void loadTransaction();
    window.addEventListener('sale:completed', onSale);
    window.addEventListener('transaction:updated', onTx);

    return () => {
      window.removeEventListener('sale:completed', onSale);
      window.removeEventListener('transaction:updated', onTx);
      void supabase.removeChannel(channel);
    };
  }, [userId, productId, loadTransaction]);

  if (!productId || loading) return null;
  if (!transaction) return null;

  const isSeller = transaction.seller_id === userId;
  const canDownloadLabel = isSeller && isPaidStatus(transaction.status);
  const canMarkShipped = isSeller && canSellerMarkShipped(transaction.status);
  const statusLabel = txStatusLabel(transaction.status);

  const handleLabelDownload = async () => {
    setActing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Nincs bejelentkezve.');
      }

      const res = await fetch('/api/transactions/foxpost-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ transactionId: transaction.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Címke generálás sikertelen');

      const label = data.label;
      downloadFoxpostLabel({
        transactionId: transaction.id,
        productName: label?.productName || transaction.productName || t('chatTransaction.defaultProduct'),
        trackingNumber: data.trackingNumber,
        sellerEmail: label?.sellerEmail || userEmail || undefined,
        foxpostTerminalId: label?.foxpostTerminalId || transaction.foxpost_terminal_id,
        foxpostTerminalName: label?.foxpostTerminalName || transaction.foxpost_terminal_name,
        foxpostTerminalAddress:
          label?.foxpostTerminalAddress || transaction.foxpost_terminal_address,
        buyerAddress: label?.foxpostTerminalAddress || transaction.foxpost_terminal_address,
      });

      setTransaction((prev) =>
        prev
          ? {
              ...prev,
              status: data.status || 'feladva',
              tracking_number: data.trackingNumber,
            }
          : prev,
      );
      setLabelDownloaded(true);
      markFoxpostLabelDownloaded(transaction.id);
      if (data.status === 'feladva') {
        setSimulating(true);
      }
      toast.success(
        data.trackingNumber
          ? `${t('chatTransaction.labelDownloaded')} (${data.trackingNumber})`
          : t('chatTransaction.labelDownloaded'),
      );
      window.dispatchEvent(
        new CustomEvent('transaction:updated', { detail: { transactionId: transaction.id } }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('chatTransaction.updateFailed'));
    } finally {
      setActing(false);
    }
  };

  const handleMarkShipped = async () => {
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

  if (!isSeller && !canDownloadLabel) {
    return (
      <div className="mx-4 mt-2 mb-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {t('chatTransaction.orderStatus')} <strong>{statusLabel}</strong>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-2 mb-1 rounded-xl border border-[#007782]/25 bg-[#007782]/5 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-800">
        <Package size={16} className="text-[#007782]" />
        <span>
          {t('chatTransaction.orderLabel')} <strong>{statusLabel}</strong>
        </span>
      </div>

      {canDownloadLabel && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => void handleLabelDownload()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#007782] bg-white px-3 py-2 text-xs font-semibold text-[#007782] hover:bg-[#007782]/5"
          >
            <Download size={14} />
            {t('chatTransaction.downloadLabel')}
          </button>
          <button
            type="button"
            disabled={acting || !labelDownloaded}
            onClick={() => void handleMarkShipped()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#007782] px-3 py-2 text-xs font-semibold text-white hover:bg-[#006670] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {acting ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
            {t('chatTransaction.markShipped')}
          </button>
        </div>
      )}

      {canDownloadLabel && !labelDownloaded && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          {t('chatTransaction.stepHint')}
        </p>
      )}

      {transaction.tracking_number ? (
        <p className="text-[11px] font-mono text-[#007782] bg-white/80 rounded px-2 py-1">
          Foxpost: {transaction.tracking_number}
        </p>
      ) : null}

      {(sellerShowsWaitingHint(transaction.status) || simulating) && (
        <p className="text-[11px] text-gray-600">
          {t('chatTransaction.simulating')}
        </p>
      )}
    </div>
  );
}
