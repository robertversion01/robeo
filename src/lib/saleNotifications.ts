/** Webhook / Realtime: eladói sikeres eladás felismerése. */
export const SALE_NOTIFICATION_MARKER = '[ROBEO_SALE]';

export type IncomingSaleAlert = {
  productId: string;
  productName: string;
  messageId?: string;
  /** Vevő user id — üzenetek deep link (`/messages?with=`). */
  buyerId?: string;
};

export const PURCHASE_SELLER_MESSAGE_BODY =
  '🎉 Rendszerüzenet: A terméket sikeresen kifizették! Kedves Eladó, kérjük készítsd össze a csomagot a szállításhoz.';

export function buildPurchaseSellerMessage(buyerAddress?: string): string {
  let content = `${SALE_NOTIFICATION_MARKER} ${PURCHASE_SELLER_MESSAGE_BODY}`;
  if (buyerAddress && buyerAddress !== 'Nincs megadva') {
    content += `\n\n📦 Vevő szállítási címe: ${buyerAddress}`;
  }
  return content;
}

export function isSaleSystemMessage(content: string, messageType?: string | null): boolean {
  if (messageType !== 'system') return false;
  return (
    content.includes(SALE_NOTIFICATION_MARKER) ||
    content.includes('sikeresen kifizették')
  );
}
