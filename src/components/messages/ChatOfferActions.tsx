'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { buyerRejectCounterOffer } from '@/lib/offerActions';
import { buildOfferStatusUpdate } from '@/lib/offers';
import { insertChatSystemMessage } from '@/lib/chatMessages';

type Props = {
  content: string;
  viewerId: string;
  otherUserId: string;
  productId?: string | null;
  viewerRole?: 'buyer' | 'seller' | 'other';
};

function parseCheckoutOfferId(content: string): string | null {
  const m = content.match(/\/checkout\?offer=([a-f0-9-]+)/i);
  return m?.[1] || null;
}

function parseCounterPrice(content: string): number | null {
  const m = content.match(/ellenajánlatot tett:\s*([\d\s]+)\s*Ft/i);
  if (!m) return null;
  const n = parseInt(m[1].replace(/\s/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export default function ChatOfferActions({
  content,
  viewerId,
  otherUserId,
  productId,
  viewerRole = 'other',
}: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [resolvedOfferId, setResolvedOfferId] = useState<string | null>(parseCheckoutOfferId(content));

  const counterPrice = parseCounterPrice(content);
  const isAccepted = content.includes('elfogadta az ajánlatod');
  const isRejected =
    content.includes('elutasította az ajánlatod') || content.includes('elutasította az ellenajánlatot');
  const isCounter = counterPrice != null && content.includes('ellenajánlatot');

  useEffect(() => {
    if (resolvedOfferId || !isCounter || !productId) return;
    let cancelled = false;
    void supabase
      .from('offers')
      .select('id')
      .eq('buyer_id', viewerId)
      .eq('product_id', productId)
      .eq('status', 'countered')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.id) setResolvedOfferId(String(data.id));
      });
    return () => {
      cancelled = true;
    };
  }, [isCounter, productId, viewerId, resolvedOfferId]);

  if (!resolvedOfferId && !isCounter) return null;
  if (isRejected && !isAccepted) {
    return <p className="mt-2 text-xs text-gray-500">{t('chatOffer.closed')}</p>;
  }
  if (viewerRole === 'seller' && isAccepted) {
    return null;
  }
  if (viewerRole !== 'buyer' && (isAccepted || isCounter)) {
    return null;
  }

  const acceptCounter = async () => {
    const id = resolvedOfferId;
    if (!id) {
      toast.error(t('chatOffer.missingOffer'));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from('offers')
        .update(buildOfferStatusUpdate('accepted'))
        .eq('id', id)
        .eq('buyer_id', viewerId);
      if (error) throw error;
      if (productId) {
        await insertChatSystemMessage(supabase, {
          senderId: viewerId,
          receiverId: otherUserId,
          content: t('chatOffer.acceptedCounterMsg'),
          productId,
        });
      }
      toast.success(t('chatOffer.accepted'));
      window.dispatchEvent(new CustomEvent('offers:updated'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('chatOffer.failed'));
    } finally {
      setBusy(false);
    }
  };

  const rejectCounter = async () => {
    const id = resolvedOfferId;
    if (!id || !productId) return;
    setBusy(true);
    try {
      const { data: offer } = await supabase
        .from('offers')
        .select('id, seller_id, product_id, products(name)')
        .eq('id', id)
        .single();
      const productName =
        (offer as { products?: { name?: string } })?.products?.name || 'termék';
      const res = await buyerRejectCounterOffer(supabase, {
        offerId: id,
        buyerId: viewerId,
        sellerId: String((offer as { seller_id?: string })?.seller_id || otherUserId),
        productId,
        productName,
      });
      if (!res.ok) throw new Error(res.error);
      toast.success(t('chatOffer.rejected'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('chatOffer.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2 justify-center">
      {isAccepted && resolvedOfferId ? (
        <Link
          href={`/checkout?offer=${resolvedOfferId}`}
          className="rounded-full bg-[#007782] px-4 py-2 text-xs font-semibold text-white"
        >
          {t('messages.payLink')}
        </Link>
      ) : null}
      {isCounter ? (
        <>
          <button
            type="button"
            disabled={busy || !resolvedOfferId}
            onClick={() => void acceptCounter()}
            className="rounded-full bg-[#007782] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {counterPrice
              ? t('chatOffer.acceptCounter', { price: counterPrice.toLocaleString('hu-HU') })
              : t('chatOffer.accept')}
          </button>
          <button
            type="button"
            disabled={busy || !resolvedOfferId}
            onClick={() => void rejectCounter()}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50"
          >
            {t('chatOffer.reject')}
          </button>
        </>
      ) : null}
    </div>
  );
}
