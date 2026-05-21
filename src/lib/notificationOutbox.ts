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
};

/**
 * Push azonnal; e-mail azonnal ha nincs digest, különben digest workerre vár.
 */
export async function flushNotificationOutbox(
  supabase: SupabaseClient,
  userId: string,
  options?: { digestOnly?: boolean; userEmail?: string | null },
): Promise<FlushOutboxResult> {
  const meta = await loadUserMetadata(supabase, userId);
  if (!meta) return { pushSent: 0, emailSent: 0, remaining: 0 };

  const delivery = parseDeliveryPrefs(meta);
  const outbox = parseNotificationOutbox(meta);
  if (outbox.length === 0) return { pushSent: 0, emailSent: 0, remaining: 0 };

  let pushSent = 0;
  let emailSent = 0;
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
      else remaining.push(...emailItems);
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
        else remaining.push(item);
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
        else remaining.push(item);
      }
    } else {
      remaining.push(...emailItems);
    }
    remaining.push(...other);
  }

  await saveUserMetadata(supabase, userId, {
    ...meta,
    [QUEUE_META_KEY]: remaining,
  });

  return { pushSent, emailSent, remaining: remaining.length };
}

export async function flushOutboxAfterRoute(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null,
): Promise<FlushOutboxResult> {
  if (!isWebPushConfigured() && !isEmailSendingConfigured()) {
    return { pushSent: 0, emailSent: 0, remaining: 0 };
  }
  return flushNotificationOutbox(supabase, userId, { userEmail });
}
