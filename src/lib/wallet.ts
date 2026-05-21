import type { SupabaseClient } from '@supabase/supabase-js';
import {
  completePendingLedgerForTransaction,
  insertWalletLedgerEntry,
} from '@/lib/walletLedger';

export type WalletRow = {
  user_id: string;
  available_balance: number;
  pending_balance: number;
  currency: string;
  updated_at: string;
};

export type TransactionWalletFields = {
  id: string;
  seller_id: string;
  product_id?: string | null;
  amount: number;
  fee?: number | null;
  shipping_cost?: number | null;
  wallet_pending_credited_at?: string | null;
  wallet_released_at?: string | null;
};

/** Eladó nettó: termékár (amount − vevővédelem − szállítás). */
export function sellerNetFromTransaction(tx: {
  amount: number;
  fee?: number | null;
  shipping_cost?: number | null;
}): number {
  const amount = Math.round(Number(tx.amount) || 0);
  const fee = Math.round(Number(tx.fee) || 0);
  const shipping = Math.round(Number(tx.shipping_cost) || 0);
  return Math.max(0, amount - fee - shipping);
}

/** Fizetés után: letét (pending_balance). */
export async function creditSellerPendingForTransaction(
  db: SupabaseClient,
  tx: TransactionWalletFields,
): Promise<void> {
  if (tx.wallet_pending_credited_at) return;

  const net = sellerNetFromTransaction(tx);
  if (net <= 0) return;

  const { error: rpcErr } = await db.rpc('credit_wallet_pending', {
    p_user_id: tx.seller_id,
    p_amount: net,
  });
  if (rpcErr) {
    throw new Error(`credit_wallet_pending: ${rpcErr.message}`);
  }

  const { error: markErr } = await db
    .from('transactions')
    .update({ wallet_pending_credited_at: new Date().toISOString() })
    .eq('id', tx.id);

  if (markErr) {
    throw new Error(`wallet_pending_credited_at: ${markErr.message}`);
  }

  await insertWalletLedgerEntry(db, {
    userId: tx.seller_id,
    entryType: 'credit_pending',
    amountHuf: net,
    status: 'pending',
    transactionId: tx.id,
    productId: tx.product_id ?? null,
    description: 'Eladás — letét (függőben)',
  });
}

/** „Minden rendben” után: pending → available. */
export async function releaseSellerWalletForTransaction(
  db: SupabaseClient,
  tx: TransactionWalletFields,
): Promise<void> {
  if (tx.wallet_released_at) return;

  const net = sellerNetFromTransaction(tx);
  if (net <= 0) {
    const { error: markErr } = await db
      .from('transactions')
      .update({ wallet_released_at: new Date().toISOString() })
      .eq('id', tx.id);
    if (markErr) throw new Error(`wallet_released_at: ${markErr.message}`);
    return;
  }

  const { error: rpcErr } = await db.rpc('release_wallet_pending_to_available', {
    p_user_id: tx.seller_id,
    p_amount: net,
  });
  if (rpcErr) {
    throw new Error(`release_wallet_pending_to_available: ${rpcErr.message}`);
  }

  const { error: markErr } = await db
    .from('transactions')
    .update({ wallet_released_at: new Date().toISOString() })
    .eq('id', tx.id);

  if (markErr) {
    throw new Error(`wallet_released_at: ${markErr.message}`);
  }

  await completePendingLedgerForTransaction(db, tx.id, 'credit_pending');

  await insertWalletLedgerEntry(db, {
    userId: tx.seller_id,
    entryType: 'release',
    amountHuf: net,
    status: 'completed',
    transactionId: tx.id,
    productId: tx.product_id ?? null,
    description: 'Eladás — elérhető egyenleg',
  });
}
