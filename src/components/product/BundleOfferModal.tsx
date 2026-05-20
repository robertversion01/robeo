'use client';

import { useEffect, useId, useState } from 'react';
import { X, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  computeBundleTotals,
  getBundleCart,
  type BundleCartItem,
} from '@/lib/sellerBundleCart';
import {
  fetchSellerBundleDiscountSettings,
} from '@/lib/bundleDiscount';
import { formatPrice } from '@/lib/utils';
import { insertChatSystemMessage } from '@/lib/chatMessages';
import { insertAppNotificationSafe } from '@/lib/supabaseResilience';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  buyerId: string;
};

export default function BundleOfferModal({ isOpen, onClose, sellerId, buyerId }: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<BundleCartItem[]>([]);
  const [totalLabel, setTotalLabel] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const cart = getBundleCart();
    const list = cart?.sellerId === sellerId ? cart.items : [];
    setItems(list);
    void fetchSellerBundleDiscountSettings(supabase, sellerId).then((settings) => {
      const totals = computeBundleTotals(list, settings);
      setTotalLabel(
        list.length >= 2 && totals.discountPercent > 0
          ? formatPrice(totals.total) + ` (−${totals.discountPercent}%)`
          : formatPrice(totals.subtotal),
      );
    });
    setMessage('');
  }, [isOpen, sellerId]);

  if (!isOpen || items.length === 0) return null;

  const submit = async () => {
    setBusy(true);
    try {
      const lines = items.map((i) => `• ${i.name} — ${formatPrice(i.price)}`).join('\n');
      const body =
        `${t('bundle.offer.messageIntro')}\n${lines}\n${t('bundle.offer.total')}: ${totalLabel}\n` +
        (message.trim() ? `\n${message.trim()}` : '');

      const msgRes = await insertChatSystemMessage(supabase, {
        senderId: buyerId,
        receiverId: sellerId,
        content: body,
      });

      if (!msgRes.ok) throw new Error(msgRes.error);

      await insertAppNotificationSafe(supabase, {
        user_id: sellerId,
        type: 'bundle_offer',
        title: t('bundle.offer.notifyTitle'),
        body: t('bundle.offer.notifyBody', { count: items.length }),
        link: '/messages',
      });

      toast.success(t('bundle.offer.sent'));
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('bundle.offer.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div
        role="dialog"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-4 shadow-xl max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 id={titleId} className="text-lg font-bold">
            {t('bundle.offer.title')}
          </h2>
          <button type="button" onClick={onClose} className="icon-btn" aria-label={t('offerModal.cancel')}>
            <X size={20} />
          </button>
        </div>
        <ul className="text-sm text-gray-700 space-y-1 mb-3 max-h-40 overflow-y-auto">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-2">
              <span className="truncate">{i.name}</span>
              <span className="shrink-0 font-semibold tabular-nums">{formatPrice(i.price)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm font-semibold text-[#007782] mb-3">
          {t('bundle.offer.total')}: {totalLabel}
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('bundle.offer.placeholder')}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[80px] mb-3"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="btn-base btn-primary w-full inline-flex items-center justify-center gap-2"
        >
          <Send size={16} />
          {busy ? t('bundle.offer.sending') : t('bundle.offer.submit')}
        </button>
      </div>
    </div>
  );
}
