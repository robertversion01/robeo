import type { SupabaseClient } from '@supabase/supabase-js';

export type SellerResponseStats = {
  medianHours: number | null;
  sampleCount: number;
  labelKey: 'sellerTrust.responseFast' | 'sellerTrust.responseNormal' | 'sellerTrust.responseSlow' | 'sellerTrust.responseNew';
};

/**
 * Eladó medián válaszideje: bejövő üzenet → első eladói válasz (utolsó 80 pára).
 */
export async function fetchSellerResponseStats(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerResponseStats> {
  const { data: incoming, error } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, product_id, created_at')
    .eq('receiver_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(80);

  if (error || !incoming?.length) {
    return { medianHours: null, sampleCount: 0, labelKey: 'sellerTrust.responseNew' };
  }

  const deltas: number[] = [];

  for (const msg of incoming) {
    const buyerId = msg.sender_id as string;
    const productId = msg.product_id as string | null;
    const at = new Date(msg.created_at as string).getTime();

    let q = supabase
      .from('messages')
      .select('created_at')
      .eq('sender_id', sellerId)
      .eq('receiver_id', buyerId)
      .gt('created_at', msg.created_at as string)
      .order('created_at', { ascending: true })
      .limit(1);

    if (productId) q = q.eq('product_id', productId);

    const { data: replies } = await q;
    const reply = replies?.[0];
    if (!reply?.created_at) continue;

    const replyAt = new Date(reply.created_at as string).getTime();
    const hours = (replyAt - at) / (1000 * 60 * 60);
    if (hours >= 0 && hours < 24 * 14) deltas.push(hours);
  }

  if (deltas.length === 0) {
    return { medianHours: null, sampleCount: 0, labelKey: 'sellerTrust.responseNew' };
  }

  deltas.sort((a, b) => a - b);
  const mid = Math.floor(deltas.length / 2);
  const medianHours =
    deltas.length % 2 === 0 ? (deltas[mid - 1] + deltas[mid]) / 2 : deltas[mid];

  let labelKey: SellerResponseStats['labelKey'] = 'sellerTrust.responseNormal';
  if (medianHours <= 2) labelKey = 'sellerTrust.responseFast';
  else if (medianHours > 24) labelKey = 'sellerTrust.responseSlow';

  return { medianHours, sampleCount: deltas.length, labelKey };
}
