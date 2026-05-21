import type { SupabaseClient } from '@supabase/supabase-js';
import { insertAppNotificationSafe } from '@/lib/supabaseResilience';
import {
  loadUserPreferences,
  parseUserPreferences,
  type NotificationChannelPrefs,
  type UserPreferenceBundle,
} from '@/lib/userPreferences';
import { appendToNotificationOutbox, parseNotificationOutbox, QUEUE_META_KEY } from '@/lib/notificationOutboxStore';
import {
  DEFAULT_DELIVERY_PREFS,
  NOTIFICATION_DELIVERY_META_KEY,
  parseDeliveryPrefs,
  type NotificationDeliveryPrefs,
} from '@/lib/notificationDeliveryPrefs';
import type {
  DeliveryChannel,
  NotificationEventType,
  NotificationOutboxItem,
  RoutedNotificationPayload,
} from '@/lib/notificationTypes';

export type {
  NotificationEventType,
  DeliveryChannel,
  RoutedNotificationPayload,
  NotificationOutboxItem,
};
export type { NotificationDeliveryPrefs };
export { DEFAULT_DELIVERY_PREFS, parseDeliveryPrefs };

export { parseNotificationOutbox, QUEUE_META_KEY };

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

export async function loadDeliveryPrefs(
  supabase: SupabaseClient,
): Promise<NotificationDeliveryPrefs> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...DEFAULT_DELIVERY_PREFS };
  return parseDeliveryPrefs(user.user_metadata as Record<string, unknown>);
}

export async function loadDeliveryPrefsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationDeliveryPrefs> {
  const admin = supabase.auth.admin;
  if (!admin?.getUserById) return { ...DEFAULT_DELIVERY_PREFS };
  const { data, error } = await admin.getUserById(userId);
  if (error || !data?.user) return { ...DEFAULT_DELIVERY_PREFS };
  return parseDeliveryPrefs(data.user.user_metadata as Record<string, unknown>);
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
    data: { ...meta, [NOTIFICATION_DELIVERY_META_KEY]: prefs },
  });
}

function hasAdminApi(supabase: SupabaseClient): boolean {
  return Boolean(supabase.auth.admin?.getUserById);
}

export async function dispatchPushNotification(
  supabase: SupabaseClient,
  payload: RoutedNotificationPayload,
  prefs: NotificationDeliveryPrefs,
): Promise<{ queued: boolean; reason?: string }> {
  if (!prefs.pushEnabled) return { queued: false, reason: 'push_disabled' };
  // Kliens oldalon nincs VAPID_PRIVATE_KEY — queue mindig, küldés a szerver flush-nél ellenőriz.
  const queued = await appendToNotificationOutbox(supabase, 'push', payload);
  return {
    queued,
    reason: queued ? 'push_queued' : 'push_queue_failed',
  };
}

export async function dispatchEmailNotification(
  supabase: SupabaseClient,
  payload: RoutedNotificationPayload,
  prefs: NotificationDeliveryPrefs,
): Promise<{ queued: boolean; reason?: string }> {
  if (!prefs.emailEnabled) return { queued: false, reason: 'email_disabled' };
  const queued = await appendToNotificationOutbox(supabase, 'email', payload);
  return {
    queued,
    reason: queued ? 'email_queued' : 'email_queue_failed',
  };
}

export async function routeMarketplaceNotification(
  supabase: SupabaseClient,
  payload: RoutedNotificationPayload,
  _options?: { userEmail?: string | null },
): Promise<{ inApp: boolean; push: boolean; email: boolean }> {
  const deliveryPrefs = hasAdminApi(supabase)
    ? await loadDeliveryPrefsForUser(supabase, payload.userId)
    : await loadDeliveryPrefs(supabase);

  let userPrefs: UserPreferenceBundle;
  if (hasAdminApi(supabase)) {
    const admin = supabase.auth.admin!;
    const { data } = await admin.getUserById(payload.userId);
    const meta = (data?.user?.user_metadata || {}) as Record<string, unknown>;
    userPrefs = parseUserPreferences(meta);
  } else {
    userPrefs = await loadUserPreferences(supabase);
  }

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

  if (deliveryPrefs.pushEnabled) {
    const res = await dispatchPushNotification(supabase, payload, deliveryPrefs);
    push = res.queued;
  }
  if (deliveryPrefs.emailEnabled) {
    const res = await dispatchEmailNotification(supabase, payload, deliveryPrefs);
    email = res.queued;
  }

  return { inApp, push, email };
}
