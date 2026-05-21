import type { SupabaseClient } from '@supabase/supabase-js';

export type WalletLedgerEntryType =
  | 'credit_pending'
  | 'release'
  | 'cashout'
  | 'debit'
  | 'adjustment';

export type WalletLedgerStatus = 'pending' | 'completed' | 'failed';

export type WalletLedgerRow = {
  id: string;
  user_id: string;
  transaction_id: string | null;
  product_id: string | null;
  entry_type: WalletLedgerEntryType;
  amount_huf: number;
  status: WalletLedgerStatus;
  description: string | null;
  created_at: string;
  completed_at: string | null;
  meta?: Record<string, unknown> | null;
};

type InsertLedgerInput = {
  userId: string;
  entryType: WalletLedgerEntryType;
  amountHuf: number;
  status?: WalletLedgerStatus;
  transactionId?: string | null;
  productId?: string | null;
  description?: string | null;
  meta?: Record<string, unknown>;
};

export async function insertWalletLedgerEntry(
  db: SupabaseClient,
  input: InsertLedgerInput,
): Promise<string | null> {
  const now = new Date().toISOString();
  const status = input.status ?? 'completed';
  const { data, error } = await db
    .from('wallet_transactions')
    .insert({
      user_id: input.userId,
      transaction_id: input.transactionId ?? null,
      product_id: input.productId ?? null,
      entry_type: input.entryType,
      amount_huf: Math.round(input.amountHuf),
      status,
      description: input.description ?? null,
      meta: input.meta ?? {},
      completed_at: status === 'completed' ? now : null,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[walletLedger] insert failed', error.message);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

export async function completePendingLedgerForTransaction(
  db: SupabaseClient,
  transactionId: string,
  entryType: WalletLedgerEntryType,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db
    .from('wallet_transactions')
    .update({ status: 'completed', completed_at: now })
    .eq('transaction_id', transactionId)
    .eq('entry_type', entryType)
    .eq('status', 'pending');

  if (error) {
    console.warn('[walletLedger] complete pending failed', error.message);
  }
}

export async function fetchWalletLedgerForUser(
  db: SupabaseClient,
  userId: string,
  limit = 40,
): Promise<WalletLedgerRow[]> {
  const { data, error } = await db
    .from('wallet_transactions')
    .select(
      'id, user_id, transaction_id, product_id, entry_type, amount_huf, status, description, created_at, completed_at, meta',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[walletLedger] fetch failed', error.message);
    return [];
  }
  return (data || []) as WalletLedgerRow[];
}
