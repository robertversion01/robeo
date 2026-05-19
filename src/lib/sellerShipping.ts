import { supabase } from '@/lib/supabase';
import { notifyTransactionStatusBothParties } from '@/lib/shippingNotifications';
import { SHIPPING_SIMULATION_DELAY_MS, TX_STATUS } from '@/lib/transactionFlow';

export type ShippingTransaction = {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  product?: { name?: string | null } | null;
};

const simulationTimersByTx = new Map<string, ReturnType<typeof setTimeout>[]>();

export function clearShippingSimulation(transactionId: string): void {
  const timers = simulationTimersByTx.get(transactionId);
  if (timers) {
    timers.forEach((t) => clearTimeout(t));
    simulationTimersByTx.delete(transactionId);
  }
}

export function scheduleShippingSimulation(
  transaction: ShippingTransaction,
  onStatusChange?: (transactionId: string, status: string) => void,
): void {
  clearShippingSimulation(transaction.id);

  const schedule = (delayMs: number, nextStatus: string) =>
    setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('transactions')
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', transaction.id);
        if (error) throw error;

        onStatusChange?.(transaction.id, nextStatus);
        await notifyTransactionStatusBothParties(supabase, transaction, nextStatus);

        if (nextStatus === TX_STATUS.ATVETELRE_VAR) {
          clearShippingSimulation(transaction.id);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('transaction:updated', { detail: { transactionId: transaction.id } }),
            );
          }
        }
      } catch (err) {
        console.error('[shipping-simulation]', err);
        clearShippingSimulation(transaction.id);
      }
    }, delayMs);

  const timers = [
    schedule(SHIPPING_SIMULATION_DELAY_MS, TX_STATUS.UTON),
    schedule(SHIPPING_SIMULATION_DELAY_MS * 2, TX_STATUS.ATVETELRE_VAR),
  ];
  simulationTimersByTx.set(transaction.id, timers);
}

/** Eladó: csomag feladva + 10s futárszimuláció (chat + profil közös logika). */
export async function markPackageShipped(
  transaction: ShippingTransaction,
  onStatusChange?: (transactionId: string, status: string) => void,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== transaction.seller_id) {
    throw new Error('Csak az eladó jelölheti feladottnak a csomagot.');
  }

  const { error } = await supabase
    .from('transactions')
    .update({ status: TX_STATUS.FELADVA, updated_at: new Date().toISOString() })
    .eq('id', transaction.id);

  if (error) throw error;

  onStatusChange?.(transaction.id, TX_STATUS.FELADVA);
  await notifyTransactionStatusBothParties(supabase, transaction, TX_STATUS.FELADVA);
  scheduleShippingSimulation(transaction, onStatusChange);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('transaction:updated', { detail: { transactionId: transaction.id } }),
    );
  }
}
