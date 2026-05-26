import type { SupabaseClient } from '@supabase/supabase-js';
import { insertChatSystemMessage } from '@/lib/chatMessages';
import { TX_STATUS_MESSAGES } from '@/lib/transactionFlow';

type TxParties = {
  product_id: string;
  buyer_id: string;
  seller_id: string;
  product?: { name?: string | null } | null;
};

function formatStatusMessage(template: string, productName: string): string {
  return template.replace(/\{product\}/g, productName);
}

/**
 * Egyetlen rendszerüzenet státuszváltáskor — a ChatSystemMessageBubble role-aware
 * átírja a szöveget (Vinted-stílusú nézet) a viewer szempontjából.
 */
export async function notifyTransactionStatusBothParties(
  supabase: SupabaseClient,
  transaction: TxParties,
  status: string,
): Promise<void> {
  const productName = transaction.product?.name?.trim() || 'a termék';
  const template = TX_STATUS_MESSAGES[status];
  if (!template) return;

  await insertChatSystemMessage(supabase, {
    senderId: transaction.seller_id,
    receiverId: transaction.buyer_id,
    content: formatStatusMessage(template, productName),
    productId: transaction.product_id,
  });
}
