import { isSaleSystemMessage, SALE_NOTIFICATION_MARKER } from '@/lib/saleNotifications';

export type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  product_id?: string | null;
  message_type?: string | null;
};

export type ConversationRow = {
  user_id: string;
  email: string;
  last_message: string;
  last_message_time: string;
  product_id: string | null;
  is_sale_thread: boolean;
};

/** Lista-előnézet: system / [ROBEO_SALE] üzenetek is olvasható címkével. */
export function formatConversationPreview(msg: MessageRow): string {
  const type = msg.message_type ?? 'text';
  if (type === 'system' || isSaleSystemMessage(msg.content, type)) {
    if (
      msg.content.includes(SALE_NOTIFICATION_MARKER) ||
      msg.content.includes('sikeresen kifizették')
    ) {
      return '🎉 Sikeres eladás — csomag összekészítése';
    }
    const line = msg.content.replace(SALE_NOTIFICATION_MARKER, '').trim().split('\n')[0];
    return line.length > 100 ? `${line.slice(0, 97)}…` : line || 'Rendszerüzenet';
  }
  if (type === 'image') return '📷 Kép';
  const text = msg.content.trim();
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

/** Utolsó üzenet / partner szerint csoportosítás, idő szerint csökkenő sorrend. */
export function buildConversationsFromMessages(
  messages: MessageRow[],
  myUserId: string,
  emailByUserId: Map<string, string>,
): ConversationRow[] {
  const convMap = new Map<string, MessageRow>();

  for (const msg of messages) {
    const otherUser = msg.sender_id === myUserId ? msg.receiver_id : msg.sender_id;
    if (!otherUser || otherUser === myUserId) continue;
    if (!convMap.has(otherUser)) {
      convMap.set(otherUser, msg);
    }
  }

  const list: ConversationRow[] = Array.from(convMap.entries()).map(([user_id, msg]) => ({
    user_id,
    email: emailByUserId.get(user_id) || 'Felhasználó',
    last_message: formatConversationPreview(msg),
    last_message_time: msg.created_at,
    product_id: msg.product_id ?? null,
    is_sale_thread: isSaleSystemMessage(msg.content, msg.message_type),
  }));

  list.sort(
    (a, b) =>
      new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime(),
  );

  return list;
}
