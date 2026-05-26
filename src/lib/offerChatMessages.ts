/** Ajánlat / fizetés rendszerüzenetek — chat szerepkör felismerés. */

export function parseCheckoutOfferId(content: string): string | null {
  const m = content.match(/\/checkout\?offer=([a-f0-9-]+)/i);
  return m?.[1] || null;
}

export function isOfferAcceptedBuyerMessage(content: string): boolean {
  return content.includes('elfogadta az ajánlatod');
}

export function isOfferRejectedBuyerMessage(content: string): boolean {
  return content.includes('elutasította az ajánlatod');
}

export function isSellerCounterOfferMessage(content: string): boolean {
  return content.includes('ellenajánlatot tett');
}

/** Vevő kapja a fizetési linket; eladó várakozási üzenetet lát. */
export function offerMessageAudience(content: string, viewerId: string, msg: {
  sender_id: string;
  receiver_id: string;
}): 'buyer' | 'seller' | 'other' {
  if (isOfferAcceptedBuyerMessage(content) || isOfferRejectedBuyerMessage(content)) {
    if (msg.receiver_id === viewerId) return 'buyer';
    if (msg.sender_id === viewerId) return 'seller';
  }
  if (isSellerCounterOfferMessage(content)) {
    if (msg.receiver_id === viewerId) return 'buyer';
    if (msg.sender_id === viewerId) return 'seller';
  }
  return 'other';
}

export function parseCounterOfferPrice(content: string): number | null {
  const m = content.match(/ellenajánlatot tett:\s*([\d\s]+)\s*Ft/i);
  if (!m) return null;
  const n = parseInt(m[1].replace(/\s/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function stripCheckoutUrlFromMessage(content: string): string {
  return content
    .replace(/\s*Fizess itt:\s*\S+/i, '')
    .replace(/\s*https?:\/\/\S+/g, '')
    .replace(/\s*\/checkout\?offer=\S+/gi, '')
    .trim();
}
