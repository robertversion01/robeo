'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { X, Send } from 'lucide-react';
import { isUuid } from '@/lib/validators';
import { buildOfferInsertRow, formatSupabaseError } from '@/lib/offers';
import { insertChatSystemMessage } from '@/lib/chatMessages';

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

  const minimumOffer = Math.ceil(originalPrice * 0.6);

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
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white border border-gray-200 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 rounded-t-2xl">
          <div className="min-w-0">
            <h3 id={titleId} className="text-lg font-bold text-gray-900 truncate">
              Ajánlat küldése
            </h3>
            <p className="text-xs text-gray-500 truncate">{productTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Bezárás"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
            <p className="text-gray-500 text-xs">Listaár</p>
            <p className="text-[#007782] font-bold text-lg tabular-nums">
              {originalPrice.toLocaleString('hu-HU')} Ft
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="offer-price" className="block text-sm font-medium text-gray-700 mb-1.5">
                Ajánlott ár (Ft)
              </label>
              <input
                id="offer-price"
                type="number"
                inputMode="numeric"
                value={price || ''}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-300 focus:border-[#007782] focus:ring-1 focus:ring-[#007782] focus:outline-none transition-colors text-gray-900 tabular-nums"
                min={minimumOffer}
                required
                disabled={loading}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Legalább {minimumOffer.toLocaleString('hu-HU')} Ft (60% a listaárhoz képest).
              </p>

              <div className="flex gap-2 mt-3">
                {[0.65, 0.75, 0.85, 0.9].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    disabled={loading}
                    onClick={() => setPrice(Math.round(originalPrice * percent))}
                    className="flex-1 py-2 text-xs font-medium rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors text-gray-800 disabled:opacity-50"
                  >
                    {Math.round(percent * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="offer-msg" className="block text-sm font-medium text-gray-700 mb-1.5">
                Üzenet (opcionális)
              </label>
              <textarea
                id="offer-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Pl. szívesen átvenném személyesen…"
                rows={3}
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-300 focus:border-[#007782] focus:ring-1 focus:ring-[#007782] focus:outline-none transition-colors resize-none text-gray-900 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#007782] hover:bg-[#006670] transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none text-white text-sm"
            >
              <Send size={18} />
              {loading ? 'Küldés…' : 'Ajánlat elküldése'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
