'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import ClientFormattedTime from '@/components/ui/ClientFormattedTime';
import ChatOfferActions from '@/components/messages/ChatOfferActions';
import {
  isOfferAcceptedBuyerMessage,
  offerMessageAudience,
  parseCheckoutOfferId,
  parseCounterOfferPrice,
  stripCheckoutUrlFromMessage,
} from '@/lib/offerChatMessages';
import {
  classifySystemMessage,
  shippingStatusBodyForRole,
} from '@/lib/systemMessageView';
import SystemMessageRoleBadge from '@/components/messages/SystemMessageRoleBadge';
import { focusOrderPanel } from '@/lib/orderPanelActions';
import { useResolvedTransactionRole } from '@/hooks/useResolvedTransactionRole';

type Props = {
  msg: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    receiver_id: string;
    product_id: string | null;
  };
  viewerId: string;
  otherUserId: string;
  timeLocale: string;
  sellerId?: string | null;
};

export default function ChatSystemMessageBubble({
  msg,
  viewerId,
  otherUserId,
  timeLocale,
  sellerId = null,
}: Props) {
  const { t } = useTranslation();
  const kind = classifySystemMessage(msg.content);
  const audience = offerMessageAudience(msg.content, viewerId, msg);
  const role = useResolvedTransactionRole(viewerId, sellerId);
  const offerId = parseCheckoutOfferId(msg.content);
  const isAccepted = isOfferAcceptedBuyerMessage(msg.content);

  let body: ReactNode = msg.content;

  if (kind === 'shipping_status') {
    const rewritten = role ? shippingStatusBodyForRole(msg.content, role) : null;
    body = <p>{rewritten || t('systemMessage.loadingHint')}</p>;
  } else if (isAccepted) {
    const plain = stripCheckoutUrlFromMessage(msg.content);
    if (audience === 'buyer' && offerId) {
      body = (
        <>
          <p>{t('chatOffer.buyerAcceptedBody')}</p>
          <Link
            href={`/checkout?offer=${offerId}`}
            className="mt-2 inline-flex rounded-full bg-[#007782] px-4 py-2 text-xs font-semibold text-white"
          >
            {t('messages.payLink')}
          </Link>
        </>
      );
    } else if (audience === 'seller') {
      body = (
        <>
          <p className="font-medium">{t('chatOffer.sellerAcceptedBody')}</p>
          <p className="mt-1 text-xs text-gray-600">{t('chatOffer.sellerWaitingBody')}</p>
        </>
      );
    } else {
      body = <p>{plain}</p>;
    }
  } else if (kind === 'offer_rejected') {
    body = (
      <p>
        {role === 'buyer'
          ? t('chatOffer.buyerRejectedBody')
          : role === 'seller'
            ? t('chatOffer.sellerRejectedBody')
            : t('systemMessage.loadingHint')}
      </p>
    );
  } else if (kind === 'offer_counter') {
    const counterPrice = parseCounterOfferPrice(msg.content);
    const priceLabel =
      counterPrice != null
        ? counterPrice.toLocaleString(timeLocale)
        : '';
    const isSellerCounter = msg.content.includes('Az eladó ellenajánlatot');
    const isBuyerCounter = msg.content.includes('A vevő ellenajánlatot');

    if (role === 'buyer' && isSellerCounter) {
      body = <p>{t('chatOffer.buyerCounterReceivedBody', { price: priceLabel })}</p>;
    } else if (role === 'seller' && isSellerCounter) {
      body = <p>{t('chatOffer.sellerCounterSentBody')}</p>;
    } else if (role === 'seller' && isBuyerCounter) {
      body = <p>{t('chatOffer.sellerCounterReceivedBody', { price: priceLabel })}</p>;
    } else if (role === 'buyer' && isBuyerCounter) {
      body = <p>{t('chatOffer.buyerCounterSentBody')}</p>;
    } else {
      body = <p>{msg.content}</p>;
    }
  } else {
    const checkoutMatch = msg.content.match(/(\/checkout\?offer=[a-f0-9-]+)/i);
    if (checkoutMatch && audience === 'buyer') {
      body = (
        <>
          {msg.content.split(checkoutMatch[0])[0]}
          <Link
            href={checkoutMatch[1]}
            className="font-semibold text-[#007782] underline underline-offset-2"
          >
            {t('messages.payLink')}
          </Link>
        </>
      );
    }
  }

  return (
    <div className="flex justify-center px-2">
      <div className="max-w-md rounded-xl border border-[#007782]/20 bg-[#007782]/5 px-4 py-2.5 text-center text-sm text-gray-700">
        {role ? (
          <div className="flex justify-center mb-1.5">
            <SystemMessageRoleBadge role={role} />
          </div>
        ) : null}
        {body}
        {role && (kind === 'shipping_status' || kind === 'sale_paid') ? (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => focusOrderPanel()}
              className="inline-flex items-center justify-center min-h-10 rounded-full border border-[#007782]/30 bg-white px-4 py-2 text-xs font-semibold text-[#007782] touch-manipulation"
            >
              {role === 'seller'
                ? t('chatTransaction.openShipping')
                : t('chatTransaction.viewOrderThread')}
            </button>
            <Link
              href={role === 'seller' ? '/orders?view=sales' : '/orders?view=purchases'}
              className="inline-flex items-center justify-center min-h-10 rounded-full border border-[#007782] bg-[#007782] px-4 py-2 text-xs font-semibold text-white hover:bg-[#006670] touch-manipulation"
            >
              {t('orderTimeline.openOrders')}
            </Link>
          </div>
        ) : null}
        <ChatOfferActions
          content={msg.content}
          viewerId={viewerId}
          otherUserId={otherUserId}
          productId={msg.product_id}
          viewerRole={audience === 'buyer' ? 'buyer' : audience === 'seller' ? 'seller' : 'other'}
        />
        <div className="mt-1 text-[10px] text-gray-400">
          <ClientFormattedTime iso={msg.created_at} locale={timeLocale} />
        </div>
      </div>
    </div>
  );
}
