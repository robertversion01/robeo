'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Package } from 'lucide-react';
import { toast } from 'sonner';
import { downloadFoxpostLabelStub } from '@/lib/foxpostLabel';
import { TX_STATUS_LABELS, isPaidStatus } from '@/lib/transactionFlow';

type Props = {
  userId: string;
  otherUserId: string;
  productId: string | null;
  userEmail?: string | null;
};

type TxRow = {
  id: string;
  status: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  productName?: string;
};

export default function ChatTransactionPanel({
  userId,
  otherUserId,
  productId,
  userEmail,
}: Props) {
  const [transaction, setTransaction] = useState<TxRow | null>(null);
  const [loading, setLoading] = useState(false);

  const loadTransaction = useCallback(async () => {
    if (!productId) {
      setTransaction(null);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, status, product_id, buyer_id, seller_id')
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
      });
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
    window.addEventListener('sale:completed', onSale);

    return () => {
      window.removeEventListener('sale:completed', onSale);
      void supabase.removeChannel(channel);
    };
  }, [userId, productId, loadTransaction]);

  if (!productId || loading) return null;
  if (!transaction) return null;

  const isSeller = transaction.seller_id === userId;
  const canDownloadLabel = isSeller && isPaidStatus(transaction.status);
  const statusLabel = TX_STATUS_LABELS[transaction.status] ?? transaction.status;

  const handleLabelDownload = () => {
    downloadFoxpostLabelStub({
      transactionId: transaction.id,
      productName: transaction.productName || 'Termék',
      sellerEmail: userEmail || undefined,
    });
    toast.success('Foxpost címke letöltve (stub HTML). Nyomtasd PDF-be!');
  };

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-[#007782]/25 bg-[#007782]/5 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-800">
          <Package size={16} className="text-[#007782]" />
          <span>
            Rendelés: <strong>{statusLabel}</strong>
          </span>
        </div>
        {canDownloadLabel && (
          <button
            type="button"
            onClick={handleLabelDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#007782] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#006670]"
          >
            <Download size={14} />
            Szállítási címke letöltése
          </button>
        )}
      </div>
      {canDownloadLabel && (
        <p className="mt-2 text-[11px] text-gray-600 leading-snug">
          Vinted-szabály: előbb töltsd le a Foxpost címkét, csak utána add fel a csomagot a profilodban
          („Csomag feladva”).
        </p>
      )}
    </div>
  );
}
