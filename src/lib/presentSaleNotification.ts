import type { IncomingSaleAlert } from '@/lib/saleNotifications';

/** Megosztott eladói popup payload (Realtime INSERT és Broadcast). */
export function buildSaleAlertPayload(
  productId: string,
  productName: string,
  messageId?: string,
): IncomingSaleAlert {
  return {
    productId,
    productName: productName.trim() || 'a terméked',
    messageId,
  };
}

export function dispatchSaleCompletedDomEvent(productId: string, productName: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('sale:completed', {
      detail: { productId, productName },
    }),
  );
}
