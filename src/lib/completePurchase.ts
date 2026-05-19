import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { insertChatSystemMessage } from '@/lib/chatMessages';
import { buildPurchaseSellerMessage } from '@/lib/saleNotifications';
import { creditSellerPendingForTransaction } from '@/lib/wallet';

export type PaidTransactionRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  status: string;
  amount: number;
  fee?: number | null;
  shipping_cost?: number | null;
  payment_intent_id?: string | null;
  checkout_completed_notified_at?: string | null;
  wallet_pending_credited_at?: string | null;
  foxpost_terminal_address?: string | null;
};

/** Közös „fizetve” állapot — Stripe webhook és wallet fizetés. */
export async function applyPaidTransactionEffects(
  db: SupabaseClient,
  transaction: PaidTransactionRow,
  paymentIntentId: string | null,
  options?: { buyerAddressOverride?: string },
): Promise<void> {
  const needsStatusUpdate = transaction.status !== 'fizetve';
  const alreadyNotified = Boolean(transaction.checkout_completed_notified_at);

  if (needsStatusUpdate) {
    const { error } = await db
      .from('transactions')
      .update({
        status: 'fizetve',
        payment_intent_id: paymentIntentId ?? transaction.payment_intent_id ?? null,
      })
      .eq('id', transaction.id);

    if (error) throw new Error(`transactions update: ${error.message}`);
  }

  const { error: productSoldErr } = await db
    .from('products')
    .update({ status: 'sold' })
    .eq('id', transaction.product_id)
    .in('status', ['active', 'reserved']);

  if (productSoldErr) {
    throw new Error(`products sold update: ${productSoldErr.message}`);
  }

  if (!alreadyNotified) {
    let buyerAddress = options?.buyerAddressOverride || 'Nincs megadva';

    if (!options?.buyerAddressOverride) {
      const { data: buyerProfile, error: profileErr } = await db
        .from('profiles')
        .select(
          'full_name, name, email, location, address, city, postal_code, address_line1, address_line2',
        )
        .eq('id', transaction.buyer_id)
        .maybeSingle();

      if (profileErr) {
        throw new Error(`profiles select: ${profileErr.message}`);
      }

      if (buyerProfile) {
        buyerAddress =
          [
            buyerProfile.location,
            buyerProfile.address,
            buyerProfile.address_line1,
            buyerProfile.city,
            buyerProfile.postal_code,
          ]
            .filter(Boolean)
            .join(', ') ||
          buyerProfile.email ||
          'Nincs megadva';
      }
    }

    const sellerMessage = buildPurchaseSellerMessage(
      buyerAddress !== 'Nincs megadva' ? buyerAddress : undefined,
    );

    const messageResult = await insertChatSystemMessage(db, {
      senderId: transaction.buyer_id,
      receiverId: transaction.seller_id,
      content: sellerMessage,
      productId: transaction.product_id,
    });

    if (!messageResult.ok) {
      throw new Error(`messages insert: ${messageResult.error}`);
    }

    const { error: notifyErr } = await db
      .from('transactions')
      .update({ checkout_completed_notified_at: new Date().toISOString() })
      .eq('id', transaction.id);

    if (notifyErr) throw new Error(`transactions notify timestamp: ${notifyErr.message}`);
  }

  await creditSellerPendingForTransaction(db, {
    id: transaction.id,
    seller_id: transaction.seller_id,
    amount: transaction.amount,
    fee: transaction.fee,
    shipping_cost: transaction.shipping_cost,
    wallet_pending_credited_at: transaction.wallet_pending_credited_at,
  });

  revalidatePath('/');
  revalidatePath('/favorites');
  revalidatePath('/profile');
}
