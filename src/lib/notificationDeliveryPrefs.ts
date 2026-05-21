export type NotificationDeliveryPrefs = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  emailDigest: boolean;
};

const DELIVERY_META_KEY = 'robeo_notification_delivery_v1';

export const DEFAULT_DELIVERY_PREFS: NotificationDeliveryPrefs = {
  pushEnabled: false,
  emailEnabled: false,
  emailDigest: true,
};

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

export const NOTIFICATION_DELIVERY_META_KEY = DELIVERY_META_KEY;
