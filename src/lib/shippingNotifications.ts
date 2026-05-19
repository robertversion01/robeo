import type { SupabaseClient } from '@supabase/supabase-js';
import { insertChatSystemMessage } from '@/lib/chatMessages';
import {
  TX_STATUS_MESSAGES,
  TX_STATUS_MESSAGES_SELLER,
} from '@/lib/transactionFlow';

type TxParties = {
  product_id: string;
  buyer_id: string;
  seller_id: string;
  product?: { name?: string | null } | null;
};

function formatStatusMessage(template: string, productName: string): string {
  return template.replace(/\{product\}/g, productName);
}

/** Vinted-stílus: mindkét fél kap rendszerüzenetet státuszváltáskor (Realtime + chat). */
export async function notifyTransactionStatusBothParties(
  supabase: SupabaseClient,
  transaction: TxParties,
  status: string,
): Promise<void> {
  const productName = transaction.product?.name?.trim() || 'a termék';
  const buyerTemplate = TX_STATUS_MESSAGES[status];
  const sellerTemplate = TX_STATUS_MESSAGES_SELLER[status];

  if (buyerTemplate) {
    await insertChatSystemMessage(supabase, {
      senderId: transaction.seller_id,
      receiverId: transaction.buyer_id,
      content: formatStatusMessage(buyerTemplate, productName),
      productId: transaction.product_id,
    });
  }

  if (sellerTemplate) {
    await insertChatSystemMessage(supabase, {
      senderId: transaction.buyer_id,
      receiverId: transaction.seller_id,
      content: formatStatusMessage(sellerTemplate, productName),
      productId: transaction.product_id,
    });
  }
}
