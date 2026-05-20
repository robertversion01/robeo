import type { SupabaseClient } from '@supabase/supabase-js';
import { insertAppNotificationSafe } from '@/lib/supabaseResilience';
import {
  loadUserPreferences,
  type NotificationChannelPrefs,
  type UserPreferenceBundle,
} from '@/lib/userPreferences';

export type NotificationEventType =
  | 'favorite'
  | 'price_drop'
  | 'offer'
  | 'message'
  | 'follower'
  | 'saved_search'
  | 'seller_new_item'
  | 'bundle_offer'
  | 'general';

export type DeliveryChannel = 'in_app' | 'push' | 'email';

export type NotificationDeliveryPrefs = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  emailDigest: boolean;
};

export type RoutedNotificationPayload = {
  userId: string;
  type: NotificationEventType;
  title: string;
  body?: string | null;
  link?: string | null;
};

const DELIVERY_META_KEY = 'robeo_notification_delivery_v1';

export const DEFAULT_DELIVERY_PREFS: NotificationDeliveryPrefs = {
  pushEnabled: false,
  emailEnabled: false,
  emailDigest: true,
};

function eventAllowed(
  type: NotificationEventType,
  prefs: NotificationChannelPrefs,
): boolean {
  switch (type) {
    case 'favorite':
      return prefs.favorites;
    case 'price_drop':
      return prefs.priceDrops;
    case 'offer':
    case 'bundle_offer':
      return prefs.offers;
    case 'message':
      return prefs.messages;
    case 'follower':
    case 'seller_new_item':
      return prefs.followers;
    case 'saved_search':
      return prefs.savedSearches;
    default:
      return true;
  }
}

export function parseDeliveryPrefs(
  metadata: Record<string, unknown> | undefined,
): NotificationDeliveryPrefs {
  const raw = metadata?.[DELIVERY_META_KEY];
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_DELIVERY_PREFS };
  const o = raw as Record<string, unknown>;
  return {
    pushEnabled: o.pushEnabled === true,
    emailEnabled: o.emailEnabled === true,
    emailDigest: o.emailDigest !== false,
  };
}

export async function loadDeliveryPrefs(
  supabase: SupabaseClient,
): Promise<NotificationDeliveryPrefs> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...DEFAULT_DELIVERY_PREFS };
  return parseDeliveryPrefs(user.user_metadata as Record<string, unknown>);
}

export async function saveDeliveryPrefs(
  supabase: SupabaseClient,
  prefs: NotificationDeliveryPrefs,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  await supabase.auth.updateUser({
    data: { ...meta, [DELIVERY_META_KEY]: prefs },
  });
}

const QUEUE_META_KEY = 'robeo_notification_outbox_v1';

export type NotificationOutboxItem = {
  id: string;
  channel: DeliveryChannel;
  payload: RoutedNotificationPayload;
  createdAt: string;
};

export function parseNotificationOutbox(
  metadata: Record<string, unknown> | undefined,
): NotificationOutboxItem[] {
  const raw = metadata?.[QUEUE_META_KEY];
  if (!Array.isArray(raw)) return [];
  return raw as NotificationOutboxItem[];
}

/** Push — előkészített integrációs pont (FCM / Web Push később) */
export async function dispatchPushNotification(
  payload: RoutedNotificationPayload,
  prefs: NotificationDeliveryPrefs,
  metadata?: Record<string, unknown>,
): Promise<{ queued: boolean; reason?: string }> {
  if (!prefs.pushEnabled) return { queued: false, reason: 'push_disabled' };
  const outbox = parseNotificationOutbox(metadata);
  outbox.unshift({
    id: crypto.randomUUID(),
    channel: 'push',
    payload,
    createdAt: new Date().toISOString(),
  });
  void metadata;
  return { queued: true, reason: 'push_queued_locally_pending_fcm' };
}

/** Email — előkészített integrációs pont (Resend / SMTP később) */
export async function dispatchEmailNotification(
  payload: RoutedNotificationPayload,
  prefs: NotificationDeliveryPrefs,
  metadata?: Record<string, unknown>,
): Promise<{ queued: boolean; reason?: string }> {
  if (!prefs.emailEnabled) return { queued: false, reason: 'email_disabled' };
  const outbox = parseNotificationOutbox(metadata);
  outbox.unshift({
    id: crypto.randomUUID(),
    channel: 'email',
    payload,
    createdAt: new Date().toISOString(),
  });
  void metadata;
  return { queued: true, reason: 'email_queued_locally_pending_smtp' };
}

/**
 * Kanonikus értesítés routing: in-app + opcionális push/email stub.
 */
export async function routeMarketplaceNotification(
  supabase: SupabaseClient,
  payload: RoutedNotificationPayload,
): Promise<{ inApp: boolean; push: boolean; email: boolean }> {
  const [userPrefs, deliveryPrefs] = await Promise.all([
    loadUserPreferences(supabase),
    loadDeliveryPrefs(supabase),
  ]);

  if (!eventAllowed(payload.type, userPrefs.notifications)) {
    return { inApp: false, push: false, email: false };
  }

  const inApp = await insertAppNotificationSafe(supabase, {
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    link: payload.link,
  });

  let push = false;
  let email = false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = (user?.user_metadata || {}) as Record<string, unknown>;

  if (deliveryPrefs.pushEnabled) {
    const res = await dispatchPushNotification(payload, deliveryPrefs, meta);
    push = res.queued;
  }
  if (deliveryPrefs.emailEnabled) {
    const res = await dispatchEmailNotification(payload, deliveryPrefs, meta);
    email = res.queued;
  }

  return { inApp, push, email };
}
