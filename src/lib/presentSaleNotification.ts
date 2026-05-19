import type { IncomingSaleAlert } from '@/lib/saleNotifications';

/** Megosztott eladói popup payload (Realtime INSERT és Broadcast). */
export function buildSaleAlertPayload(
  productId: string,
  productName: string,
  options?: { messageId?: string; buyerId?: string },
): IncomingSaleAlert {
  return {
    productId,
    productName: productName.trim() || 'a terméked',
    messageId: options?.messageId,
    buyerId: options?.buyerId,
  };
}

export function dispatchSaleCompletedDomEvent(
  productId: string,
  productName: string,
  buyerId?: string,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('sale:completed', {
      detail: { productId, productName, buyerId },
    }),
  );
}
