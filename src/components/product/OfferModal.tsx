'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { X, Send } from 'lucide-react';
import { isUuid } from '@/lib/validators';
import { buildOfferInsertRow, formatSupabaseError, minimumOfferHuf } from '@/lib/offers';
import { insertChatSystemMessage } from '@/lib/chatMessages';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';
import PriceBreakdown from '@/components/product/PriceBreakdown';
import { useTranslation } from 'react-i18next';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  sellerId: string;
  productTitle: string;
  originalPrice: number;
}

export default function OfferModal({
  isOpen,
  onClose,
  productId,
  sellerId,
  productTitle,
  originalPrice,
}: OfferModalProps) {
  const { t, i18n } = useTranslation();
  const priceLocale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [price, setPrice] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || originalPrice <= 0) return;
    setPrice(Math.round(originalPrice * 0.85));
    setMessage('');
    setLoading(false);
  }, [isOpen, originalPrice]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const minimumOffer = minimumOfferHuf(originalPrice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (price <= 0) {
      toast.error('Kérlek adj meg egy érvényes árat!');
      return;
    }
    if (price < minimumOffer) {
      toast.error(
        `Minimum ajánlat: ${minimumOffer.toLocaleString('hu-HU')} Ft (a vételár legalább 60%-a).`
      );
      return;
    }
    if (!isUuid(productId) || !isUuid(sellerId)) {
      toast.error(
        'Hiányzó vagy hibás termék/eladó azonosító. Frissítsd az oldalt, majd próbáld újra.'
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Először be kell jelentkezned!');
        return;
      }
      if (!isUuid(user.id)) {
        toast.error('Hibás felhasználói azonosító. Jelentkezz ki-be, majd próbáld újra.');
        return;
      }

      if (user.id === sellerId) {
        toast.error('Nem küldhetsz ajánlatot a saját termékedre!');
        return;
      }

      let resolvedSellerId = sellerId;
      if (!isUuid(resolvedSellerId)) {
        const { data: productRow } = await supabase
          .from('products')
          .select('user_id')
          .eq('id', productId)
          .maybeSingle();
        resolvedSellerId = productRow?.user_id ?? '';
      }

      if (!isUuid(resolvedSellerId)) {
        toast.error('Nem található az eladó. Frissítsd az oldalt, majd próbáld újra.');
        return;
      }

      const offerRow = buildOfferInsertRow({
        productId,
        buyerId: user.id,
        sellerId: resolvedSellerId,
        offeredPriceHuf: price,
        message: message.trim() || null,
      });

      const { error } = await supabase.from('offers').insert(offerRow);

      if (error) {
        if (error.code === '23505') {
          toast.error('Már küldtél ajánlatot erre a termékre!');
        } else if (error.code === '23514' || error.message?.includes('60%')) {
          toast.error(
            `Az ajánlat túl alacsony. Minimum: ${minimumOffer.toLocaleString('hu-HU')} Ft.`,
          );
        } else {
          throw error;
        }
      } else {
        const notify = await insertChatSystemMessage(supabase, {
          senderId: user.id,
          receiverId: resolvedSellerId,
          content: `Új ajánlat érkezett: ${price.toLocaleString('hu-HU')} Ft`,
          productId,
        });
        if (!notify.ok) {
          console.warn('[OfferModal] seller notify message failed', notify.error);
        }

        trackEvent(AnalyticsEvent.OfferSent, { source: 'product' });
        toast.success('Ajánlat elküldve. Az eladó értesítést kap az üzenetekben.');
        window.dispatchEvent(new CustomEvent('offers:updated'));
        onCloseRef.current();
      }
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'message' in error
          ? formatSupabaseError(error as { message?: string; details?: string; hint?: string })
          : error instanceof Error
            ? error.message
            : 'Ismeretlen hiba';
      console.error('[OfferModal] insert failed', error);
      toast.error('Hiba az ajánlat küldése közben: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      role="presentation"
      onClick={() => onCloseRef.current()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-[#1a2328] border border-[#2a3941] shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#27363d] bg-[#1a2328] px-4 py-3 rounded-t-2xl">
          <div className="min-w-0">
            <h3 id={titleId} className="text-lg font-bold text-[#e7edf0] truncate">
              Ajánlat küldése
            </h3>
            <p className="text-xs text-[#8fa3ad] truncate">{productTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="shrink-0 p-2 rounded-full hover:bg-[#243038] transition-colors text-[#8fa3ad]"
            aria-label="Bezárás"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-xl bg-[#141d21] border border-[#2a3941] p-3">
            <p className="text-[#8fa3ad] text-xs">{t('offerModal.listPrice')}</p>
            <p className="text-[#007782] font-bold text-lg tabular-nums">
              {originalPrice.toLocaleString(priceLocale)} {t('common.currencyHuf')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="offer-price" className="block text-sm font-medium text-[#b2c0c6] mb-1.5">
                Ajánlott ár (Ft)
              </label>
              <input
                id="offer-price"
                type="number"
                inputMode="numeric"
                value={price || ''}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1a2328] border border-[#2a3941] focus:border-[#007782] focus:ring-1 focus:ring-[#007782] focus:outline-none transition-colors text-[#e7edf0] tabular-nums"
                min={minimumOffer}
                required
                disabled={loading}
              />
              <p className="mt-1.5 text-xs text-[#8fa3ad]">
                {t('offerModal.minHint', { min: minimumOffer.toLocaleString(priceLocale) })}
              </p>

              <div className="flex gap-2 mt-3">
                {[0.65, 0.75, 0.85, 0.9].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    disabled={loading}
                    onClick={() => setPrice(Math.round(originalPrice * percent))}
                    className="flex-1 py-2 text-xs font-medium rounded-lg bg-[#1a2328] border border-[#2a3941] hover:bg-gray-200 transition-colors text-[#e7edf0] disabled:opacity-50"
                  >
                    {Math.round(percent * 100)}%
                  </button>
                ))}
              </div>
            </div>

            {price > 0 && (
              <div className="rounded-xl border border-[#2a3941] bg-[#141d21]/80 p-3">
                <p className="text-xs font-medium text-[#8fa3ad] mb-2">{t('offerModal.estimateTitle')}</p>
                <PriceBreakdown price={price} />
              </div>
            )}

            <div>
              <label htmlFor="offer-msg" className="block text-sm font-medium text-[#b2c0c6] mb-1.5">
                {t('offerModal.messageLabel')}
              </label>
              <textarea
                id="offer-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('offerModal.messagePlaceholder')}
                rows={3}
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1a2328] border border-[#2a3941] focus:border-[#007782] focus:ring-1 focus:ring-[#007782] focus:outline-none transition-colors resize-none text-[#e7edf0] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#007782] hover:bg-[#006670] transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none text-white text-sm"
            >
              <Send size={18} />
              {loading ? t('offerModal.sending') : t('offerModal.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
