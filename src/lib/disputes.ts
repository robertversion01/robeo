import type { SupabaseClient } from '@supabase/supabase-js';
import { TX_STATUS } from '@/lib/transactionFlow';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_refund'
  | 'resolved_reject'
  | 'cancelled';

export type DisputeReason = 'not_received' | 'not_as_described' | 'damaged' | 'other';

export type DisputeRow = {
  id: string;
  transaction_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: DisputeStatus;
  admin_note: string | null;
  resolved_at: string | null;
  created_at: string;
};

const TERMINAL_TX = new Set([
  'payment_pending',
  'payment_failed',
  'refunded',
  'cancelled',
  'dispute_open',
]);

const ELIGIBLE_TX = new Set([
  'paid',
  'fizetve',
  TX_STATUS.FELADVA,
  TX_STATUS.UTON,
  TX_STATUS.ATVETELRE_VAR,
  'delivered',
  TX_STATUS.SIKERESEN_ATVEVE,
  'completed',
  'funds_released',
]);

export function canBuyerOpenDispute(txStatus: string, disputeStatus: string | null | undefined): boolean {
  if (TERMINAL_TX.has(txStatus) || txStatus === 'refunded') return false;
  if (disputeStatus && ['open', 'under_review'].includes(disputeStatus)) return false;
  return ELIGIBLE_TX.has(txStatus);
}

export function isDisputeActive(status: DisputeStatus): boolean {
  return status === 'open' || status === 'under_review';
}

export function disputeReasonLabel(reason: string, locale: string): string {
  const hu: Record<string, string> = {
    not_received: 'Nem érkezett meg',
    not_as_described: 'Nem egyezik a leírással',
    damaged: 'Sérült / hibás',
    other: 'Egyéb',
  };
  const en: Record<string, string> = {
    not_received: 'Not received',
    not_as_described: 'Not as described',
    damaged: 'Damaged / defective',
    other: 'Other',
  };
  const map = locale.startsWith('en') ? en : hu;
  return map[reason] || reason;
}

export async function fetchDisputeForTransaction(
  supabase: SupabaseClient,
  transactionId: string,
): Promise<DisputeRow | null> {
  const { data } = await supabase
    .from('disputes')
    .select('id, transaction_id, reporter_id, reason, details, status, admin_note, resolved_at, created_at')
    .eq('transaction_id', transactionId)
    .maybeSingle();
  return (data as DisputeRow) || null;
}

export function normalizeDisputeReason(raw: string): DisputeReason {
  const v = raw.trim();
  if (v === 'not_received' || v === 'not_as_described' || v === 'damaged' || v === 'other') {
    return v;
  }
  return 'other';
}
