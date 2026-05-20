import type { SupabaseClient } from '@supabase/supabase-js';

export type FeedPreferences = {
  brands: string[];
  sizes: string[];
  styles: string[];
  conditions: string[];
};

export type NotificationChannelPrefs = {
  favorites: boolean;
  priceDrops: boolean;
  offers: boolean;
  messages: boolean;
  followers: boolean;
  savedSearches: boolean;
};

export type UserPreferenceBundle = {
  feed: FeedPreferences;
  notifications: NotificationChannelPrefs;
};

const META_KEY = 'robeo_preferences_v1';

export const DEFAULT_FEED_PREFS: FeedPreferences = {
  brands: [],
  sizes: [],
  styles: [],
  conditions: [],
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationChannelPrefs = {
  favorites: true,
  priceDrops: true,
  offers: true,
  messages: true,
  followers: true,
  savedSearches: true,
};

export const DEFAULT_USER_PREFS: UserPreferenceBundle = {
  feed: DEFAULT_FEED_PREFS,
  notifications: DEFAULT_NOTIFICATION_PREFS,
};

function normalizeFeed(raw: unknown): FeedPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_FEED_PREFS };
  const o = raw as Record<string, unknown>;
  return {
    brands: Array.isArray(o.brands) ? o.brands.map(String).filter(Boolean) : [],
    sizes: Array.isArray(o.sizes) ? o.sizes.map(String).filter(Boolean) : [],
    styles: Array.isArray(o.styles) ? o.styles.map(String).filter(Boolean) : [],
    conditions: Array.isArray(o.conditions) ? o.conditions.map(String).filter(Boolean) : [],
  };
}

function normalizeNotifications(raw: unknown): NotificationChannelPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_NOTIFICATION_PREFS };
  const o = raw as Record<string, unknown>;
  return {
    favorites: o.favorites !== false,
    priceDrops: o.priceDrops !== false,
    offers: o.offers !== false,
    messages: o.messages !== false,
    followers: o.followers !== false,
    savedSearches: o.savedSearches !== false,
  };
}

export function parseUserPreferences(metadata: Record<string, unknown> | undefined): UserPreferenceBundle {
  const raw = metadata?.[META_KEY];
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_USER_PREFS };
  const o = raw as Record<string, unknown>;
  return {
    feed: normalizeFeed(o.feed),
    notifications: normalizeNotifications(o.notifications),
  };
}

export async function loadUserPreferences(
  supabase: SupabaseClient,
): Promise<UserPreferenceBundle> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...DEFAULT_USER_PREFS };
  return parseUserPreferences(user.user_metadata as Record<string, unknown>);
}

export async function saveUserPreferences(
  supabase: SupabaseClient,
  prefs: UserPreferenceBundle,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const prev = meta[META_KEY];
  const prevObj =
    prev && typeof prev === 'object' ? (prev as Record<string, unknown>) : {};
  await supabase.auth.updateUser({
    data: {
      [META_KEY]: {
        ...prevObj,
        feed: prefs.feed,
        notifications: prefs.notifications,
      },
    },
  });
}
