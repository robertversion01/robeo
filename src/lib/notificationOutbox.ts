import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { parseDeliveryPrefs } from '@/lib/notificationDeliveryPrefs';
import type { NotificationOutboxItem } from '@/lib/notificationTypes';
import {
  parseNotificationOutbox,
  QUEUE_META_KEY,
} from '@/lib/notificationOutboxStore';
import { sendWebPushToUser } from '@/lib/webPushSend';
import { isWebPushConfigured } from '@/lib/webPushConfig';
import {
  buildNotificationEmailHtml,
  sendEmail,
} from '@/lib/emailSend';
import { isEmailSendingConfigured } from '@/lib/emailConfig';

export { parseNotificationOutbox, QUEUE_META_KEY } from '@/lib/notificationOutboxStore';

async function loadUserMetadata(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) {
    return (user.user_metadata || {}) as Record<string, unknown>;
  }
  const admin = supabase.auth.admin;
  if (!admin?.getUserById) return null;
  const { data, error } = await admin.getUserById(userId);
  if (error || !data?.user) return null;
  return (data.user.user_metadata || {}) as Record<string, unknown>;
}

async function saveUserMetadata(
  supabase: SupabaseClient,
  userId: string,
  meta: Record<string, unknown>,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) {
    const { error } = await supabase.auth.updateUser({ data: meta });
    return !error;
  }
  const admin = supabase.auth.admin;
  if (!admin?.updateUserById) return false;
  const { error } = await admin.updateUserById(userId, { user_metadata: meta });
  return !error;
}

export type FlushOutboxResult = {
  pushSent: number;
  emailSent: number;
  remaining: number;
  pruned: number;
  retried: number;
};

const MAX_OUTBOX_ATTEMPTS = 5;
const OUTBOX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function pruneStaleOutbox(items: NotificationOutboxItem[]): {
  kept: NotificationOutboxItem[];
  pruned: number;
} {
  const now = Date.now();
  const kept: NotificationOutboxItem[] = [];
  let pruned = 0;
  for (const item of items) {
    const age = now - new Date(item.createdAt).getTime();
    const attempts = item.attempts ?? 0;
    if (age > OUTBOX_MAX_AGE_MS || attempts >= MAX_OUTBOX_ATTEMPTS) {
      pruned += 1;
      continue;
    }
    kept.push(item);
  }
  return { kept, pruned };
}

function markAttempt(item: NotificationOutboxItem): NotificationOutboxItem {
  return {
    ...item,
    attempts: (item.attempts ?? 0) + 1,
    lastAttemptAt: new Date().toISOString(),
  };
}

/**
 * Push azonnal; e-mail azonnal ha nincs digest, különben digest workerre vár.
 */
export async function flushNotificationOutbox(
  supabase: SupabaseClient,
  userId: string,
  options?: { digestOnly?: boolean; userEmail?: string | null },
): Promise<FlushOutboxResult> {
  const meta = await loadUserMetadata(supabase, userId);
  if (!meta) return { pushSent: 0, emailSent: 0, remaining: 0, pruned: 0, retried: 0 };

  const delivery = parseDeliveryPrefs(meta);
  const { kept: outbox, pruned } = pruneStaleOutbox(parseNotificationOutbox(meta));
  if (outbox.length === 0) {
    if (pruned > 0) {
      await saveUserMetadata(supabase, userId, { ...meta, [QUEUE_META_KEY]: [] });
    }
    return { pushSent: 0, emailSent: 0, remaining: 0, pruned, retried: 0 };
  }

  let pushSent = 0;
  let emailSent = 0;
  let retried = 0;
  const remaining: NotificationOutboxItem[] = [];

  const pushItems = outbox.filter((i) => i.channel === 'push');
  const emailItems = outbox.filter((i) => i.channel === 'email');
  const other = outbox.filter((i) => i.channel !== 'push' && i.channel !== 'email');

  if (options?.digestOnly) {
    remaining.push(...pushItems, ...other);
    if (!delivery.emailEnabled || !delivery.emailDigest || emailItems.length === 0) {
      remaining.push(...emailItems);
    } else if (isEmailSendingConfigured() && options.userEmail) {
      const { subject, html, text } = buildNotificationEmailHtml(
        emailItems.map((i) => i.payload),
        true,
      );
      const ok = await sendEmail({ to: options.userEmail, subject, html, text });
      if (ok) emailSent = emailItems.length;
      else {
        remaining.push(...emailItems.map(markAttempt));
        retried += emailItems.length;
      }
    } else {
      remaining.push(...emailItems);
    }
  } else {
    if (delivery.pushEnabled && isWebPushConfigured()) {
      for (const item of pushItems) {
        const res = await sendWebPushToUser(supabase, userId, {
          title: item.payload.title,
          body: item.payload.body,
          url: item.payload.link,
        });
        if (res.sent > 0) pushSent += 1;
        else {
          remaining.push(markAttempt(item));
          retried += 1;
        }
      }
    } else {
      remaining.push(...pushItems);
    }

    const instantEmail =
      delivery.emailEnabled && !delivery.emailDigest && isEmailSendingConfigured();
    if (instantEmail && options?.userEmail) {
      for (const item of emailItems) {
        const { subject, html, text } = buildNotificationEmailHtml([item.payload], false);
        const ok = await sendEmail({
          to: options.userEmail,
          subject,
          html,
          text,
        });
        if (ok) emailSent += 1;
        else {
          remaining.push(markAttempt(item));
          retried += 1;
        }
      }
    } else {
      remaining.push(...emailItems);
    }
    remaining.push(...other);
  }

  const finalRemaining = pruneStaleOutbox(remaining).kept;

  await saveUserMetadata(supabase, userId, {
    ...meta,
    [QUEUE_META_KEY]: finalRemaining,
  });

  return {
    pushSent,
    emailSent,
    remaining: finalRemaining.length,
    pruned,
    retried,
  };
}

export async function flushOutboxAfterRoute(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null,
): Promise<FlushOutboxResult> {
  if (!isWebPushConfigured() && !isEmailSendingConfigured()) {
    return { pushSent: 0, emailSent: 0, remaining: 0, pruned: 0, retried: 0 };
  }
  return flushNotificationOutbox(supabase, userId, { userEmail });
}

/** Cron: felhasználók outbox újrapróbálása (service role). */
export async function retryPendingOutboxesForUsers(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<{ users: number; pushSent: number; emailSent: number; pruned: number }> {
  let pushSent = 0;
  let emailSent = 0;
  let pruned = 0;
  let users = 0;

  for (const userId of userIds) {
    const meta = await loadUserMetadata(supabase, userId);
    if (!meta) continue;
    const outbox = parseNotificationOutbox(meta);
    if (outbox.length === 0) continue;

    let email: string | null = null;
    const admin = supabase.auth.admin;
    if (admin?.getUserById) {
      const { data } = await admin.getUserById(userId);
      email = data?.user?.email ?? null;
    }

    const res = await flushNotificationOutbox(supabase, userId, { userEmail: email });
    pushSent += res.pushSent;
    emailSent += res.emailSent;
    pruned += res.pruned;
    users += 1;
  }

  return { users, pushSent, emailSent, pruned };
}
