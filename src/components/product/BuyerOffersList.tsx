'use client';

import { useEffect, useState, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Check, Clock, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { OFFER_LABELS_BUYER, offerBadgeClass } from '@/lib/offerUi';

type ProductJoin = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  images?: unknown;
};

type BuyerOfferRow = {
  id: string;
  offered_price: number;
  status: string;
  message: string | null;
  created_at: string;
  seller_id: string;
  product: ProductJoin | ProductJoin[] | null;
};

function thumbFromProduct(p: ProductJoin | null): string | null {
  if (!p) return null;
  if (p.image_url) return p.image_url;
  if (Array.isArray(p.images) && p.images.length && typeof p.images[0] === 'string') {
    return p.images[0];
  }
  return null;
}

export default function BuyerOffersList() {
  const [offers, setOffers] = useState<BuyerOfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOfferId, setActingOfferId] = useState<string | null>(null);

  const loadOffers = useCallback(async (buyerId: string) => {
    const { data, error } = await supabase
      .from('offers')
      .select(
        `
          id,
          offered_price,
          status,
          message,
          created_at,
          seller_id,
          product:products(id, name, price, image_url, images)
        `
      )
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map((item: BuyerOfferRow) => ({
      ...item,
      product: Array.isArray(item.product) ? item.product[0] : item.product,
    }));
    setOffers(mapped);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      try {
        await loadOffers(user.id);
      } catch (e) {
        console.error(e);
        setOffers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (cancelled) return;

      channel = supabase
        .channel(`buyer-offers-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'offers',
            filter: `buyer_id=eq.${user.id}`,
          },
          () => {
            loadOffers(user.id).catch(() => setOffers([]));
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadOffers]);

  const acceptSellerCounter = async (offerId: string) => {
    setActingOfferId(offerId);
    try {
      const { error } = await supabase
        .from('offers')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (error) throw error;

      const row = offers.find((o) => o.id === offerId);
      const product =
        row?.product && !Array.isArray(row.product) ? row.product : null;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && row?.seller_id && product?.id) {
        await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: row.seller_id,
          content: `✅ Elfogadtam az ellenajánlatot (${row.offered_price.toLocaleString('hu-HU')} Ft).`,
          product_id: product.id,
          is_system_message: true,
          message_type: 'system',
        });
      }

      toast.success('Ellenajánlat elfogadva — most már fizethetsz.');
      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status: 'accepted' } : o))
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ismeretlen hiba';
      toast.error(msg);
    } finally {
      setActingOfferId(null);
    }
  };

  const busy = (id: string) => actingOfferId === id;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#007782]" aria-hidden />
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Még nem küldtél ajánlatot egy termékre sem.</p>
        <p className="text-sm mt-2 text-gray-400">
          A termék oldalán az „Ajánlat” gombbal kezdhetsz alkudni.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => {
        const product =
          offer.product && !Array.isArray(offer.product) ? offer.product : null;
        const thumb = thumbFromProduct(product);
        const label = OFFER_LABELS_BUYER[offer.status] ?? offer.status;

        return (
          <div
            key={offer.id}
            className="card-base overflow-hidden border border-gray-200/80 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row gap-4 p-4">
              {product ? (
                <Link
                  href={`/products/${product.id}`}
                  className="shrink-0 w-20 h-20 sm:w-16 sm:h-16 rounded-xl bg-gray-100 overflow-hidden ring-1 ring-gray-100 hover:ring-[#007782]/30 transition-all"
                >
                  {thumb ? (
                    <img
                      src={getOptimizedImageUrl(thumb, 160, 85)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>
                  )}
                </Link>
              ) : (
                <div className="shrink-0 w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center text-2xl">
                  📷
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1">
                {product ? (
                  <Link
                    href={`/products/${product.id}`}
                    className="font-semibold text-gray-900 hover:text-[#007782] line-clamp-2"
                  >
                    {product.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-gray-900">Termék</span>
                )}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[#007782] font-bold tabular-nums">
                    {offer.offered_price.toLocaleString('hu-HU')} Ft
                  </span>
                  {product && (
                    <span className="text-gray-500 text-sm tabular-nums">
                      listaár: {product.price.toLocaleString('hu-HU')} Ft
                    </span>
                  )}
                </div>
                {offer.message ? (
                  <p className="text-gray-600 text-sm mt-2 line-clamp-2 border-l-2 border-gray-200 pl-2">
                    „{offer.message}”
                  </p>
                ) : null}

                <span
                  className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 text-xs font-medium rounded-full border ${offerBadgeClass(offer.status)}`}
                >
                  {offer.status === 'pending' && <Clock size={13} />}
                  {offer.status === 'accepted' && <Check size={13} />}
                  {offer.status === 'countered' && <RefreshCw size={13} />}
                  {label}
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:items-end sm:justify-center">
                {offer.status === 'countered' && (
                  <button
                    type="button"
                    disabled={busy(offer.id)}
                    onClick={() => acceptSellerCounter(offer.id)}
                    className="btn-base btn-primary min-h-10 px-4 text-sm rounded-xl w-full sm:w-auto inline-flex items-center justify-center gap-2"
                  >
                    {busy(offer.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Ellenajánlat elfogadása
                  </button>
                )}

                {offer.status === 'accepted' && (
                  <Link
                    href={`/checkout?offer=${offer.id}`}
                    className="inline-flex items-center justify-center gap-2 btn-base btn-primary min-h-10 px-4 text-sm rounded-xl w-full sm:w-auto"
                  >
                    <ExternalLink size={16} />
                    Fizetés / checkout
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
