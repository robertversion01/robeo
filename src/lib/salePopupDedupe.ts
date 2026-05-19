import type { IncomingSaleAlert } from '@/lib/saleNotifications';

const STORAGE_KEY = 'robeo_sale_popup_consumed_v1';
const memoryConsumed = new Set<string>();

function readStorageKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set(memoryConsumed);
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(memoryConsumed);
    const parsed = JSON.parse(raw) as string[];
    return new Set([...memoryConsumed, ...parsed]);
  } catch {
    return new Set(memoryConsumed);
  }
}

function writeStorageKeys(keys: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    /* ignore quota */
  }
}

/**
 * Egy eladáshoz egy kulcs (Realtime INSERT, Broadcast, DOM esemény).
 * Ne használj messageId / transactionId kulcsként — különböző források más ID-t adnak.
 */
export function getSaleNotificationDedupeKey(alert: IncomingSaleAlert): string {
  const productId = alert.productId?.trim() || '';
  const buyerId = alert.buyerId?.trim() || '';
  if (productId && buyerId) return `sale:${productId}:${buyerId}`;
  if (productId) return `sale:${productId}`;
  const messageId = alert.messageId?.trim() || '';
  if (messageId) return `sale:msg:${messageId}`;
  return 'sale:unknown';
}

export function isSaleNotificationConsumed(key: string): boolean {
  const keys = readStorageKeys();
  return keys.has(key);
}

/**
 * Atomikus „egyszer mutasd” — sessionStorage + memória.
 * Ha false, SOHA ne jeleníts meg popupot/toastot ehhez a kulcshoz ebben a munkamenetben.
 */
export function tryConsumeSaleNotificationSlot(key: string): boolean {
  const keys = readStorageKeys();
  if (keys.has(key)) {
    return false;
  }
  keys.add(key);
  memoryConsumed.add(key);
  writeStorageKeys(keys);
  return true;
}

/** @deprecated use tryConsumeSaleNotificationSlot */
export function claimSalePopupSlot(productId: string, buyerId?: string): boolean {
  return tryConsumeSaleNotificationSlot(
    getSaleNotificationDedupeKey({
      productId,
      productName: '',
      buyerId,
    }),
  );
}

export function hasSalePopupBeenShown(productId: string, buyerId?: string): boolean {
  return isSaleNotificationConsumed(
    getSaleNotificationDedupeKey({
      productId,
      productName: '',
      buyerId,
    }),
  );
}
