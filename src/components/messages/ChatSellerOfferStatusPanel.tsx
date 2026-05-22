'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { isPaidStatus } from '@/lib/transactionFlow';

type Props = {
  viewerId: string;
  otherUserId: string | null;
  productId: string | null;
};

/** Eladó: elfogadott ajánlat, még nincs kifizetve — Vinted-szerű várakozás. */
export default function ChatSellerOfferStatusPanel({ viewerId, otherUserId, productId }: Props) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!productId || !otherUserId) {
      setShow(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: product } = await supabase
        .from('products')
        .select('user_id')
        .eq('id', productId)
        .maybeSingle();

      const sellerId = product?.user_id;
      if (!sellerId || sellerId !== viewerId) {
        setShow(false);
        return;
      }

      const buyerId = otherUserId;

      const [offerRes, txRes] = await Promise.all([
        supabase
          .from('offers')
          .select('id, status')
          .eq('seller_id', sellerId)
          .eq('buyer_id', buyerId)
          .eq('product_id', productId)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('transactions')
          .select('status')
          .eq('product_id', productId)
          .eq('seller_id', sellerId)
          .eq('buyer_id', buyerId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const hasAccepted = Boolean(offerRes.data);
      const txPaid = txRes.data?.status ? isPaidStatus(String(txRes.data.status)) : false;
      setShow(hasAccepted && !txPaid);
    } finally {
      setLoading(false);
    }
  }, [viewerId, otherUserId, productId]);

  useEffect(() => {
    void load();
    const onUpdate = () => void load();
    window.addEventListener('offers:updated', onUpdate);
    window.addEventListener('transaction:updated', onUpdate);
    window.addEventListener('sale:completed', onUpdate);
    return () => {
      window.removeEventListener('offers:updated', onUpdate);
      window.removeEventListener('transaction:updated', onUpdate);
      window.removeEventListener('sale:completed', onUpdate);
    };
  }, [load]);

  if (loading || !show) return null;

  return (
    <div className="mx-4 mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
      <p className="font-semibold text-amber-950">{t('chatOffer.sellerWaitingTitle')}</p>
      <p className="text-xs text-amber-900/80 mt-0.5">{t('chatOffer.sellerWaitingBody')}</p>
    </div>
  );
}
