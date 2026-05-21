'use client';

import { supabase } from '@/lib/supabase';

/** Kliens routing után outbox flush (push/email), ha env be van állítva a szerveren. */
export async function requestNotificationFlush(): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch('/api/notifications/flush', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    /* offline */
  }
}
