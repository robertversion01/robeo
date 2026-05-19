import type { SupabaseClient } from '@supabase/supabase-js';

/** Közös Supabase Broadcast csatorna (checkout success → eladó popup fallback). */
export const ROBEO_GLOBAL_EVENTS_CHANNEL = 'robeo-global-events';

export const SALE_COMPLETED_BROADCAST_EVENT = 'sale-completed';

export type SaleCompletedBroadcastPayload = {
  sellerId: string;
  buyerId: string;
  productId: string;
  productName: string;
  transactionId?: string;
};

/**
 * Vevő checkout success oldalról: azonnali jelzés az eladónak (Realtime INSERT RLS mellett is).
 */
export async function emitSaleCompletedBroadcast(
  supabase: SupabaseClient,
  payload: SaleCompletedBroadcastPayload,
): Promise<void> {
  return new Promise((resolve) => {
    const channel = supabase.channel(ROBEO_GLOBAL_EVENTS_CHANNEL, {
      config: { broadcast: { ack: false, self: false } },
    });

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      void supabase.removeChannel(channel);
      resolve();
    };

    const timeout = setTimeout(finish, 3000);

    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      void channel
        .send({
          type: 'broadcast',
          event: SALE_COMPLETED_BROADCAST_EVENT,
          payload,
        })
        .then(() => {
          clearTimeout(timeout);
          setTimeout(finish, 200);
        })
        .catch((err) => {
          console.warn('[globalEvents] sale-completed broadcast failed', err);
          clearTimeout(timeout);
          finish();
        });
    });
  });
}
