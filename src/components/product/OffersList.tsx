'use client';

import { useEffect, useState, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Check, X, Clock, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { offerBadgeClass } from '@/lib/offerUi';
import { isOfferAwaitingAction } from '@/lib/offerExpiry';
import OfferExpiryCountdown from '@/components/offers/OfferExpiryCountdown';
import { sellerSendCounterOffer, sellerSetOfferStatus } from '@/lib/offerActions';
import { useTranslation } from 'react-i18next';

interface Offer {
  id: string;
  offered_price: number;
  message: string | null;
  status: string;
  created_at: string;
  expires_at?: string | null;
  buyer_id: string;
  seller_id?: string;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    images?: unknown;
  };
}

function offerThumbUrl(product: Offer['product']): string | null {
  if (product.image_url) return product.image_url;
  if (Array.isArray(product.images) && product.images.length && typeof product.images[0] === 'string') {
    return product.images[0];
  }
  return null;
}

export default function OffersList() {
  const { t, i18n } = useTranslation();
  const priceLocale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [counterValues, setCounterValues] = useState<Record<string, string>>({});
  const [actingOfferId, setActingOfferId] = useState<string | null>(null);

  const loadOffers = useCallback(async (sellerId: string) => {
    const { data, error } = await supabase
      .from('offers')
      .select(
        `
          id,
          offered_price,
          message,
          status,
          created_at,
          expires_at,
          buyer_id,
          product:products(id, name, price, image_url, images)
        `
      )
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map((item: Record<string, unknown>) => ({
      ...item,
      product: Array.isArray(item.product) ? item.product[0] : item.product,
    }));
    setOffers(mapped as Offer[]);
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
      } catch (e: unknown) {
        console.error('OffersList load:', e);
        setOffers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (cancelled) return;

      channel = supabase
        .channel(`seller-offers-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'offers',
            filter: `seller_id=eq.${user.id}`,
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

  useEffect(() => {
    const onOffersUpdated = () => {
      supabase.auth.getUser().then(({ data: { user: u } }) => {
        if (u?.id) loadOffers(u.id).catch(() => setOffers([]));
      });
    };
    window.addEventListener('offers:updated', onOffersUpdated);
    return () => window.removeEventListener('offers:updated', onOffersUpdated);
  }, [loadOffers]);

  const statusLabel = (status: string) =>
    t(`offersList.status.${status}`, { defaultValue: status });

  const updateOfferStatus = async (offerId: string, status: 'accepted' | 'rejected') => {
    if (status === 'rejected') {
      const ok = window.confirm(t('offersList.rejectConfirm'));
      if (!ok) return;
    }

    const currentOffer = offers.find((o) => o.id === offerId);
    if (!currentOffer) return;

    setActingOfferId(offerId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('offersList.loginRequired'));
        return;
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
        (typeof window !== 'undefined' ? window.location.origin : '');

      const result = await sellerSetOfferStatus(supabase, {
        offerId,
        status,
        sellerId: user.id,
        buyerId: currentOffer.buyer_id,
        productId: currentOffer.product.id,
        productName: currentOffer.product.name,
        checkoutBaseUrl: baseUrl,
      });

      if (!result.ok) {
        toast.error(t('offersList.errorPrefix', { msg: result.error }));
        return;
      }

      if (result.messageWarning) {
        toast.warning(
          status === 'accepted'
            ? t('offersList.acceptedWarn', { msg: result.messageWarning })
            : t('offersList.rejectedWarn', { msg: result.messageWarning }),
        );
      } else {
        toast.success(
          status === 'accepted' ? t('offersList.acceptedToast') : t('offersList.rejectedToast'),
        );
      }

      setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, status } : o)));
      await loadOffers(user.id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('offersList.unknownError');
      toast.error(t('offersList.errorPrefix', { msg }));
    } finally {
      setActingOfferId(null);
    }
  };

  const sendCounterOffer = async (offer: Offer) => {
    const rawValue = counterValues[offer.id];
    const counterPrice = Number(rawValue);
    if (!counterPrice || counterPrice <= 0) {
      toast.error(t('offersList.counterInvalid'));
      return;
    }

    const minimumAllowed = Math.ceil(offer.product.price * 0.6);
    if (counterPrice < minimumAllowed) {
      toast.error(t('offersList.counterMin', { min: minimumAllowed.toLocaleString(priceLocale) }));
      return;
    }

    setActingOfferId(offer.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const result = await sellerSendCounterOffer(supabase, {
        offerId: offer.id,
        sellerId: user.id,
        buyerId: offer.buyer_id,
        productId: offer.product.id,
        productName: offer.product.name,
        counterPriceHuf: counterPrice,
      });

      if (!result.ok) {
        toast.error(t('offersList.errorPrefix', { msg: result.error }));
        return;
      }

      if (result.messageWarning) {
        toast.warning(t('offersList.counterWarn', { msg: result.messageWarning }));
      } else {
        toast.success(t('offersList.counterSent'));
      }

      setOffers((prev) =>
        prev.map((o) =>
          o.id === offer.id ? { ...o, status: 'countered', offered_price: counterPrice } : o
        ),
      );
      await loadOffers(user.id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('offersList.unknownError');
      toast.error(t('offersList.errorPrefix', { msg }));
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
        <p>{t('offersList.emptyTitle')}</p>
        <p className="text-sm mt-2 text-gray-400">{t('offersList.emptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => {
        const thumb = offerThumbUrl(offer.product);
        const label = statusLabel(offer.status);
        const actionable = isOfferAwaitingAction(offer.status, offer.expires_at, offer.created_at);

        return (
          <div
            key={offer.id}
            className="card-base overflow-hidden border border-gray-200/80 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row gap-4 p-4">
              <Link
                href={`/products/${offer.product.id}`}
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

              <div className="flex-1 min-w-0 space-y-1">
                <Link
                  href={`/products/${offer.product.id}`}
                  className="font-semibold text-gray-900 hover:text-[#007782] line-clamp-2"
                >
                  {offer.product.name}
                </Link>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[#007782] font-bold tabular-nums">
                    {offer.offered_price.toLocaleString(priceLocale)} {t('common.currencyHuf')}
                  </span>
                  <span className="text-gray-500 text-sm tabular-nums">
                    {t('offersList.listPrice')} {offer.product.price.toLocaleString(priceLocale)} {t('common.currencyHuf')}
                  </span>
                </div>
                {offer.message ? (
                  <p className="text-gray-600 text-sm border-l-2 border-gray-200 pl-2 mt-2">
                    „{offer.message}”
                  </p>
                ) : null}

                <span
                  className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 text-xs font-medium rounded-full border ${offerBadgeClass(offer.status)}`}
                >
                  {offer.status === 'pending' && <Clock size={13} />}
                  {offer.status === 'accepted' && <Check size={13} />}
                  {offer.status === 'rejected' && <X size={13} />}
                  {label}
                </span>
                <OfferExpiryCountdown
                  expiresAt={offer.expires_at}
                  createdAt={offer.created_at}
                  className="mt-1 block"
                />
              </div>

              <div className="flex flex-col gap-3 sm:items-end sm:min-w-[200px]">
                {offer.status === 'pending' && actionable && (
                  <>
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          disabled={busy(offer.id)}
                          value={counterValues[offer.id] ?? ''}
                          onChange={(e) =>
                            setCounterValues((prev) => ({
                              ...prev,
                              [offer.id]: e.target.value,
                            }))
                          }
                          placeholder={t('offersList.counterPlaceholder')}
                          className="min-w-0 flex-1 input-base min-h-10 px-3 text-sm rounded-xl border-gray-300 focus:ring-[#007782] focus:border-[#007782]"
                        />
                        <button
                          type="button"
                          disabled={busy(offer.id)}
                          onClick={() => sendCounterOffer(offer)}
                          className="btn-base btn-secondary min-h-10 px-3 text-xs shrink-0 rounded-xl inline-flex items-center gap-1"
                        >
                          {busy(offer.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : null}
                          {t('offersList.counterBtn')}
                        </button>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          disabled={busy(offer.id)}
                          onClick={() => updateOfferStatus(offer.id, 'accepted')}
                          className="btn-base btn-primary min-h-10 px-4 flex-1 sm:flex-none rounded-xl inline-flex items-center justify-center gap-1.5 text-sm"
                        >
                          {busy(offer.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check size={16} />
                          )}
                          {t('offersList.accept')}
                        </button>
                        <button
                          type="button"
                          disabled={busy(offer.id)}
                          onClick={() => updateOfferStatus(offer.id, 'rejected')}
                          className="btn-base border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 min-h-10 px-4 flex-1 sm:flex-none rounded-xl inline-flex items-center justify-center gap-1.5 text-sm"
                        >
                          <X size={16} />
                          {t('offersList.reject')}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {offer.status === 'countered' && (
                  <p className="text-xs text-gray-600 text-right max-w-xs">
                    {t('offersList.counteredHint')}
                  </p>
                )}

                {offer.status === 'accepted' && (
                  <span className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1.5 text-right">
                    <ExternalLink size={14} className="shrink-0" />
                    {t('offersList.acceptedHint')}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
