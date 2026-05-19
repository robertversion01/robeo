import type { SupabaseClient } from '@supabase/supabase-js';
import { formatSupabaseError } from '@/lib/offers';

export type SystemMessageInput = {
  senderId: string;
  receiverId: string;
  content: string;
  productId?: string | null;
};

/** Éles DB: csak `message_type = 'system'` (nincs `is_system_message` oszlop). */
export async function insertChatSystemMessage(
  supabase: SupabaseClient,
  input: SystemMessageInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('messages').insert({
    sender_id: input.senderId,
    receiver_id: input.receiverId,
    content: input.content,
    product_id: input.productId ?? null,
    message_type: 'system',
  });

  if (error) {
    console.error('[chatMessages] system insert failed', error);
    return { ok: false, error: formatSupabaseError(error) };
  }
  return { ok: true };
}
