'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buyerRejectCounterOffer } from '@/lib/offerActions';
import { buildOfferStatusUpdate } from '@/lib/offers';
import { isOfferAwaitingAction } from '@/lib/offerExpiry';
import OfferExpiryCountdown from '@/components/offers/OfferExpiryCountdown';
import { toast } from 'sonner';

type OfferRow = {
  id: string;
  offered_price: number;
  status: string;
  seller_id: string;
  product_id: string;
  expires_at?: string | null;
};

type Props = {
  buyerId: string;
  productId: string | null;
  sellerId: string | null;
};

/** Vevő ajánlatok az aktív beszélgetés termékére — chat fejléc alatt */
export default function ChatBuyerOffersPanel({ buyerId, productId, sellerId }: Props) {
  const { t } = useTranslation();
  const [offer, setOffer] = useState<OfferRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!productId || !buyerId) {
      setOffer(null);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('offers')
      .select('id, offered_price, status, seller_id, product_id, expires_at')
      .eq('buyer_id', buyerId)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setOffer((data as OfferRow) || null);
    setLoading(false);
  }, [buyerId, productId]);

  useEffect(() => {
    void load();
    const onUpdate = () => void load();
    window.addEventListener('offers:updated', onUpdate);
    return () => window.removeEventListener('offers:updated', onUpdate);
  }, [load]);

  if (!productId || loading) return null;
  if (!offer || !isOfferAwaitingAction(offer.status, offer.expires_at)) {
    if (offer?.status === 'accepted') {
      return (
        <div className="mx-4 mb-2 rounded-xl border border-[#007782]/25 bg-[#007782]/5 px-3 py-2.5 text-sm">
          <p className="font-semibold text-gray-900">
            {t('chatOffer.panelTitle', { price: offer.offered_price.toLocaleString('hu-HU') })}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">{t('chatOffer.status.accepted')}</p>
          <Link
            href={`/checkout?offer=${offer.id}`}
            className="mt-2 inline-flex rounded-full bg-[#007782] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {t('messages.payLink')}
          </Link>
        </div>
      );
    }
    return null;
  }

  const accept = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('offers')
        .update(buildOfferStatusUpdate('accepted'))
        .eq('id', offer.id);
      if (error) throw error;
      toast.success(t('chatOffer.accepted'));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('chatOffer.failed'));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!sellerId) return;
    setBusy(true);
    try {
      const res = await buyerRejectCounterOffer(supabase, {
        offerId: offer.id,
        buyerId,
        sellerId,
        productId,
        productName: 'termék',
      });
      if (!res.ok) throw new Error(res.error);
      toast.success(t('chatOffer.rejected'));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('chatOffer.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-4 mb-2 rounded-xl border border-[#007782]/25 bg-[#007782]/5 px-3 py-2.5 text-sm">
      <p className="font-semibold text-gray-900">
        {t('chatOffer.panelTitle', { price: offer.offered_price.toLocaleString('hu-HU') })}
      </p>
      <p className="text-xs text-gray-600 mt-0.5">{t(`chatOffer.status.${offer.status}`)}</p>
      <OfferExpiryCountdown expiresAt={offer.expires_at} className="mt-1" />
      <div className="mt-2 flex flex-wrap gap-2">
        {offer.status === 'countered' ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void accept()}
              className="rounded-full bg-[#007782] px-3 py-1.5 text-xs font-semibold text-white"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : t('chatOffer.accept')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void reject()}
              className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold"
            >
              {t('chatOffer.reject')}
            </button>
          </>
        ) : null}
        {offer.status === 'pending' ? (
          <p className="text-[11px] text-gray-500">{t('chatOffer.pendingHint')}</p>
        ) : null}
      </div>
    </div>
  );
}
