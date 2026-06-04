import { isSaleSystemMessage, SALE_NOTIFICATION_MARKER } from '@/lib/saleNotifications';
import { LOCAL_PICKUP_MARKER } from '@/lib/systemMessageView';
import { ROBEO_BP_MODE } from '@/lib/features';

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

/** Lista-előnézet: system / [ROBEO_SALE] / [ROBEO_LOCAL_PICKUP] üzenetek
 *  olvasható címkével. A marker bracket-eket SOHA nem mutatjuk a usernek. */
export function formatConversationPreview(msg: MessageRow): string {
  const type = msg.message_type ?? 'text';
  // RobeoBP: lokális átvétel foglalási marker — emoji-s összegzés (a marker
  // bracket-jét nem mutatjuk, a user csak "Foglalás: helyi átvétel" feliratot
  // lát a lista-előnézetben).
  if (msg.content.includes(LOCAL_PICKUP_MARKER)) {
    return '🤝 Foglalás — helyi átvétel egyeztetés';
  }
  if (type === 'system' || isSaleSystemMessage(msg.content, type)) {
    if (
      msg.content.includes(SALE_NOTIFICATION_MARKER) ||
      msg.content.includes('sikeresen kifizették')
    ) {
      return '🎉 Sikeres eladás — csomag összekészítése';
    }
    const line = msg.content
      .replace(SALE_NOTIFICATION_MARKER, '')
      .replace(LOCAL_PICKUP_MARKER, '')
      .trim()
      .split('\n')[0];
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
  defaultUserLabel = 'User',
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
    email: emailByUserId.get(user_id) || defaultUserLabel,
    last_message: formatConversationPreview(msg),
    last_message_time: msg.created_at,
    product_id: msg.product_id ?? null,
    is_sale_thread: isSaleSystemMessage(msg.content, msg.message_type),
  }));

  list.sort(
    (a, b) =>
      new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime(),
  );

  // RobeoBP UX: a regi V1 sale-history konverzaciokat (utolso uzenetuk
  // [ROBEO_SALE] markert tartalmaz) elrejtjuk a listabol — DB nem torlodik,
  // csak a BP build vevoje nem latja a Stripe-flow-bol szarmazo regi tradeket.
  // BP-relevant konverzaciok: amelyek vagy `[ROBEO_LOCAL_PICKUP]` markert
  // tartalmaznak vagy egyaltalan nincs system marker (tisztan emberi chat).
  if (ROBEO_BP_MODE) {
    return list.filter((row) => {
      const lastMsg = convMap.get(row.user_id);
      if (!lastMsg) return true;
      const content = lastMsg.content || '';
      if (content.includes(LOCAL_PICKUP_MARKER)) return true;
      // V1 sale / shipping history: rejtve
      if (
        content.includes(SALE_NOTIFICATION_MARKER) ||
        content.includes('sikeresen kifizették') ||
        isSaleSystemMessage(content, lastMsg.message_type)
      ) {
        return false;
      }
      return true;
    });
  }

  return list;
}
