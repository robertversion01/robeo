/**
 * Supabase `offers` sor — éles DB-n a legacy `price` oszlop NOT NULL,
 * a checkout/ajánlat flow pedig az `offered_price` mezőt használja.
 */
export type OfferInsertRow = {
  product_id: string;
  buyer_id: string;
  seller_id: string;
  offered_price: number;
  price: number;
  status: string;
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
  };
  if (input.message !== undefined) {
    row.message = input.message?.trim() ? input.message.trim() : null;
  }
  return row;
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
