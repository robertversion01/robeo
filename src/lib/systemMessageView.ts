import { SALE_NOTIFICATION_MARKER } from '@/lib/saleNotifications';
import { TX_STATUS_MESSAGES, TX_STATUS_MESSAGES_SELLER } from '@/lib/transactionFlow';

export type SystemMessageKind =
  | 'sale_paid'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'offer_counter'
  | 'shipping_status'
  | 'generic';

export type ChatMessageRole = 'buyer' | 'seller';

type MsgRef = {
  sender_id: string;
  receiver_id: string;
};

/** Néző szerepe a tranzakcióban — role-aware szöveghez. */
export function messageIntendedRole(
  viewerId: string,
  _msg: MsgRef,
  sellerId: string | null,
): ChatMessageRole {
  if (sellerId) {
    return viewerId === sellerId ? 'seller' : 'buyer';
  }
  return 'buyer';
}

export function classifySystemMessage(content: string): SystemMessageKind {
  if (
    content.includes(SALE_NOTIFICATION_MARKER) ||
    content.includes('sikeresen kifizették') ||
    content.includes('Sikeresen kifizetted')
  ) {
    return 'sale_paid';
  }
  if (content.includes('elfogadta az ajánlatod')) return 'offer_accepted';
  if (content.includes('elutasította az ajánlatod') || content.includes('elutasította az ellenajánlatot')) {
    return 'offer_rejected';
  }
  if (content.includes('ellenajánlatot tett')) return 'offer_counter';
  if (detectShippingStatusKey(content)) return 'shipping_status';
  return 'generic';
}

function detectShippingStatusKey(content: string): string | null {
  for (const key of Object.keys(TX_STATUS_MESSAGES)) {
    const snippet = TX_STATUS_MESSAGES[key].replace(/\{product\}/g, '').slice(0, 12);
    if (snippet && content.includes(snippet.trim())) return key;
  }
  for (const key of Object.keys(TX_STATUS_MESSAGES_SELLER)) {
    const snippet = TX_STATUS_MESSAGES_SELLER[key].replace(/\{product\}/g, '').slice(0, 12);
    if (snippet && content.includes(snippet.trim())) return key;
  }
  if (content.includes('feladta') || content.includes('feladottnak')) return 'feladva';
  if (content.includes('úton van') || content.includes('úton van')) return 'uton';
  if (content.includes('megérkezett') || content.includes('Átvételre')) return 'atvetelre_var';
  if (content.includes('átvételét') || content.includes('átvette')) return 'sikeresen_atveve';
  return null;
}

function extractProductName(content: string, fallback: string): string {
  const match = content.match(/[„"]([^„""]+?)["""]/);
  if (match && match[1] && match[1].trim() && match[1].trim() !== 'a termék') {
    return match[1].trim();
  }
  return fallback;
}

export function shippingStatusBodyForRole(
  content: string,
  role: ChatMessageRole,
  productName?: string,
): string | null {
  const key = detectShippingStatusKey(content);
  if (!key) return null;
  const template =
    role === 'seller'
      ? TX_STATUS_MESSAGES_SELLER[key] || TX_STATUS_MESSAGES[key]
      : TX_STATUS_MESSAGES[key] || TX_STATUS_MESSAGES_SELLER[key];
  if (!template) return null;
  const resolvedName = productName?.trim() || extractProductName(content, 'a termék');
  return template.replace(/\{product\}/g, resolvedName);
}

export function isSaleSystemContent(content: string, messageType?: string | null): boolean {
  if (messageType !== 'system') return false;
  return classifySystemMessage(content) === 'sale_paid';
}
