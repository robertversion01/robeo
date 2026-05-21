'use client';

import { supabase } from '@/lib/supabase';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function subscribeToWebPush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: 'unsupported' };

  const vapidRes = await fetch('/api/push/vapid-public-key');
  if (!vapidRes.ok) return { ok: false, error: 'vapid_unavailable' };
  const { publicKey } = (await vapidRes.json()) as { publicKey?: string };
  if (!publicKey) return { ok: false, error: 'vapid_missing' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, error: 'permission_denied' };

  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: 'not_signed_in' };

  const subJson = subscription.toJSON();
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      expirationTime: subJson.expirationTime ?? null,
      keys: subJson.keys,
    }),
  });

  if (!res.ok) return { ok: false, error: 'subscribe_failed' };
  return { ok: true };
}

export async function unsubscribeFromWebPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    }
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
