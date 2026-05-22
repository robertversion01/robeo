/**
 * Supabase `offers` sor — éles DB-n a legacy `price` oszlop NOT NULL,
 * a checkout/ajánlat flow pedig az `offered_price` mezőt használja.
 */
import { offerExpiresAt } from '@/lib/offerExpiry';

export type OfferInsertRow = {
  product_id: string;
  buyer_id: string;
  seller_id: string;
  offered_price: number;
  price: number;
  status: string;
  expires_at: string;
  message?: string | null;
};

export function buildOfferInsertRow(input: {
  productId: string;
  buyerId: string;
  sellerId: string;
  offeredPriceHuf: number;
  message?: string | null;
  status?: string;
}): OfferInsertRow {
  const amount = Math.max(1, Math.round(input.offeredPriceHuf));
  const row: OfferInsertRow = {
    product_id: input.productId,
    buyer_id: input.buyerId,
    seller_id: input.sellerId,
    offered_price: amount,
    price: amount,
    status: input.status ?? 'pending',
    expires_at: offerExpiresAt(),
  };
  if (input.message !== undefined) {
    row.message = input.message?.trim() ? input.message.trim() : null;
  }
  return row;
}

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered';

/** Minimum ajánlat a listaárhoz képest (Vinted ~60%). */
export const MIN_OFFER_PERCENT = 0.6;

export function minimumOfferHuf(listPriceHuf: number): number {
  return Math.max(1, Math.ceil(Math.max(0, listPriceHuf) * MIN_OFFER_PERCENT));
}

export function buildOfferStatusUpdate(
  status: OfferStatus,
  options?: { offeredPriceHuf?: number; refreshExpiry?: boolean },
): Record<string, string | number> {
  const patch: Record<string, string | number> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (options?.offeredPriceHuf !== undefined) {
    const amount = Math.max(1, Math.round(options.offeredPriceHuf));
    patch.offered_price = amount;
    patch.price = amount;
  }
  if (options?.refreshExpiry) {
    patch.expires_at = offerExpiresAt();
  }
  return patch;
}

export function formatSupabaseError(error: {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}): string {
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return parts.join(' — ') || 'Ismeretlen hiba';
}
