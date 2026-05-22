import type { SupabaseClient } from '@supabase/supabase-js';
import { insertChatSystemMessage } from '@/lib/chatMessages';
import { buildOfferStatusUpdate, formatSupabaseError, type OfferStatus } from '@/lib/offers';

export type OfferActionResult =
  | { ok: true; status: OfferStatus; messageWarning?: string }
  | { ok: false; error: string };

/** Eladó: ajánlat elfogadása / elutasítása + rendszerüzenet a chatbe. */
export async function sellerSetOfferStatus(
  supabase: SupabaseClient,
  input: {
    offerId: string;
    status: 'accepted' | 'rejected';
    sellerId: string;
    buyerId: string;
    productId: string;
    productName: string;
    checkoutBaseUrl: string;
  },
): Promise<OfferActionResult> {
  const { error: updateError } = await supabase
    .from('offers')
    .update(buildOfferStatusUpdate(input.status))
    .eq('id', input.offerId)
    .eq('seller_id', input.sellerId);

  if (updateError) {
    return { ok: false, error: formatSupabaseError(updateError) };
  }

  const content =
    input.status === 'accepted'
      ? `Az eladó elfogadta az ajánlatod (${input.productName}). Fizess itt: ${input.checkoutBaseUrl}/checkout?offer=${input.offerId}`
      : `Az eladó elutasította az ajánlatod (${input.productName}).`;

  const msg = await insertChatSystemMessage(supabase, {
    senderId: input.sellerId,
    receiverId: input.buyerId,
    content,
    productId: input.productId,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offers:updated'));
  }

  return {
    ok: true,
    status: input.status,
    messageWarning: msg.ok ? undefined : msg.error,
  };
}

/** Eladó: ellenajánlat. */
export async function sellerSendCounterOffer(
  supabase: SupabaseClient,
  input: {
    offerId: string;
    sellerId: string;
    buyerId: string;
    productId: string;
    productName: string;
    counterPriceHuf: number;
  },
): Promise<OfferActionResult> {
  const { error: updateError } = await supabase
    .from('offers')
    .update(buildOfferStatusUpdate('countered', { offeredPriceHuf: input.counterPriceHuf, refreshExpiry: true }))
    .eq('id', input.offerId)
    .eq('seller_id', input.sellerId);

  if (updateError) {
    return { ok: false, error: formatSupabaseError(updateError) };
  }

  const msg = await insertChatSystemMessage(supabase, {
    senderId: input.sellerId,
    receiverId: input.buyerId,
    content: `Az eladó ellenajánlatot tett: ${input.counterPriceHuf.toLocaleString('hu-HU')} Ft — ${input.productName}`,
    productId: input.productId,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offers:updated'));
  }

  return {
    ok: true,
    status: 'countered',
    messageWarning: msg.ok ? undefined : msg.error,
  };
}

/** Vevő: ellenajánlat elutasítása. */
export async function buyerRejectCounterOffer(
  supabase: SupabaseClient,
  input: {
    offerId: string;
    buyerId: string;
    sellerId: string;
    productId: string;
    productName: string;
  },
): Promise<OfferActionResult> {
  const { error: updateError } = await supabase
    .from('offers')
    .update(buildOfferStatusUpdate('rejected'))
    .eq('id', input.offerId)
    .eq('buyer_id', input.buyerId);

  if (updateError) {
    return { ok: false, error: formatSupabaseError(updateError) };
  }

  const msg = await insertChatSystemMessage(supabase, {
    senderId: input.buyerId,
    receiverId: input.sellerId,
    content: `A vevő elutasította az ellenajánlatot (${input.productName}).`,
    productId: input.productId,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offers:updated'));
  }

  return {
    ok: true,
    status: 'rejected',
    messageWarning: msg.ok ? undefined : msg.error,
  };
}
