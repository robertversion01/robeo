import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { getVapidSubject, isWebPushConfigured } from '@/lib/webPushConfig';
import {
  PUSH_SUBSCRIPTIONS_META_KEY,
  parsePushSubscriptions,
} from '@/lib/pushSubscriptions';

export type WebPushPayload = {
  title: string;
  body?: string | null;
  url?: string | null;
};

function configureVapid(): boolean {
  if (!isWebPushConfigured()) return false;
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    '';
  webpush.setVapidDetails(getVapidSubject(), publicKey, process.env.VAPID_PRIVATE_KEY!.trim());
  return true;
}

export async function sendWebPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: WebPushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!configureVapid()) return { sent: 0, failed: 0 };

  const admin = supabase.auth.admin;
  if (!admin?.getUserById) return { sent: 0, failed: 0 };

  const { data, error } = await admin.getUserById(userId);
  if (error || !data?.user) return { sent: 0, failed: 0 };

  const subs = parsePushSubscriptions(data.user.user_metadata as Record<string, unknown>);
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://robeo.vercel.app';
  const link = payload.url?.startsWith('http')
    ? payload.url
    : `${base.replace(/\/$/, '')}${payload.url?.startsWith('/') ? payload.url : `/${payload.url || ''}`}`;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    url: link,
  });

  let sent = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime ?? undefined,
          keys: sub.keys,
        },
        body,
      );
      sent += 1;
    } catch (e) {
      failed += 1;
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) staleEndpoints.push(sub.endpoint);
    }
  }

  if (staleEndpoints.length > 0) {
    const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
    const kept = parsePushSubscriptions(meta).filter(
      (s) => !staleEndpoints.includes(s.endpoint),
    );
    await admin.updateUserById(userId, {
      user_metadata: { ...meta, [PUSH_SUBSCRIPTIONS_META_KEY]: kept },
    });
  }

  return { sent, failed };
}
