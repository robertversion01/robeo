import type { TFunction } from 'i18next';

/** Messenger-szerű üzenetcsoportosítás — tiszta, determinista, no-AI. */

export type GroupableMessage = {
  id: string;
  sender_id: string;
  created_at: string;
  message_type?: string | null;
  is_system_message?: boolean;
};

export type ChatRenderItem<T> = {
  message: T;
  isSystem: boolean;
  /** Nap-váltáskor dátumelválasztó jelenik meg felette. */
  showDateSeparator: boolean;
  dateLabel: string;
  /** Csoport első/utolsó eleme (azonos feladó, közeli idő). */
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  /** Időbélyeg csak a csoport utolsó buborékánál (kevésbé zsúfolt). */
  showTime: boolean;
};

/** Ennél nagyobb szünet után új csoport kezdődik. */
export const CHAT_GROUP_GAP_MS = 5 * 60 * 1000;

function isSystemMessage(message: GroupableMessage): boolean {
  return message.message_type === 'system' || Boolean(message.is_system_message);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDateSeparator(date: Date, locale: string, t: TFunction): string {
  const now = new Date();
  if (isSameCalendarDay(date, now)) {
    return t('messages.today', { defaultValue: 'Ma' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) {
    return t('messages.yesterday', { defaultValue: 'Tegnap' });
  }
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Beszélgetéslista időbélyeg: ma -> óra:perc, tegnap -> "Tegnap", régebbi -> rövid dátum. */
export function formatConversationTimestamp(
  iso: string,
  locale: string,
  t: TFunction,
): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (isSameCalendarDay(date, now)) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) {
    return t('messages.yesterday', { defaultValue: 'Tegnap' });
  }
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function startsNewGroup(current: GroupableMessage, previous?: GroupableMessage): boolean {
  if (!previous) return true;
  if (isSystemMessage(current) || isSystemMessage(previous)) return true;
  if (current.sender_id !== previous.sender_id) return true;
  const gap =
    new Date(current.created_at).getTime() - new Date(previous.created_at).getTime();
  if (gap > CHAT_GROUP_GAP_MS) return true;
  if (!isSameCalendarDay(new Date(current.created_at), new Date(previous.created_at))) {
    return true;
  }
  return false;
}

export function buildChatRenderItems<T extends GroupableMessage>(
  messages: T[],
  locale: string,
  t: TFunction,
): ChatRenderItem<T>[] {
  return messages.map((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const date = new Date(message.created_at);
    const isSystem = isSystemMessage(message);

    const showDateSeparator =
      !previous || !isSameCalendarDay(date, new Date(previous.created_at));

    const isFirstInGroup = isSystem ? true : startsNewGroup(message, previous);
    const isLastInGroup = isSystem ? true : !next || startsNewGroup(next, message);

    return {
      message,
      isSystem,
      showDateSeparator,
      dateLabel: showDateSeparator ? formatDateSeparator(date, locale, t) : '',
      isFirstInGroup,
      isLastInGroup,
      showTime: isSystem ? false : isLastInGroup,
    };
  });
}
