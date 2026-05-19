'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  fetchAppNotifications,
  markAllAppNotificationsRead,
  markAppNotificationRead,
  type AppNotificationRow,
} from '@/lib/appNotificationsFeed';
import { useNotifications } from '@/context/NotificationContext';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('hu-HU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function AppNotificationsFeed() {
  const { refreshUnread } = useNotifications();
  const [items, setItems] = useState<AppNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setItems([]);
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const rows = await fetchAppNotifications(supabase, user.id);
    setItems(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`app-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void load();
          void refreshUnread();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load, refreshUnread]);

  const markAllRead = async () => {
    if (!userId) return;
    await markAllAppNotificationsRead(supabase, userId);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    await refreshUnread();
  };

  const openNotification = async (row: AppNotificationRow) => {
    if (!row.read_at) {
      await markAppNotificationRead(supabase, row.id);
      setItems((prev) =>
        prev.map((n) =>
          n.id === row.id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      );
      await refreshUnread();
    }
  };

  if (!userId && !loading) {
    return (
      <main className={`min-h-screen bg-white ${MAIN_TOP_PADDING} px-4 pb-20`}>
        <p className="text-center text-gray-600 mt-12">
          <Link href="/auth" className="text-[#007782] font-semibold hover:underline">
            Jelentkezz be
          </Link>{' '}
          az értesítések megtekintéséhez.
        </p>
      </main>
    );
  }

  return (
    <main className={`min-h-screen bg-white ${MAIN_TOP_PADDING} px-4 pb-20`}>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between py-4 border-b border-gray-200 mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell size={22} className="text-[#007782]" />
            Értesítések
          </h1>
          {items.some((n) => !n.read_at) ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#007782]"
            >
              <CheckCheck size={16} />
              Mind olvasott
            </button>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 text-center py-8">Betöltés…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Még nincs értesítésed.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => {
              const inner = (
                <div
                  className={`rounded-xl border p-4 transition-colors ${
                    n.read_at
                      ? 'border-gray-200 bg-white'
                      : 'border-[#007782]/30 bg-[#007782]/5'
                  }`}
                >
                  <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                  {n.body ? <p className="text-sm text-gray-600 mt-1">{n.body}</p> : null}
                  <p className="text-[10px] text-gray-400 mt-2">{formatWhen(n.created_at)}</p>
                </div>
              );

              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link href={n.link} onClick={() => void openNotification(n)}>
                      {inner}
                    </Link>
                  ) : (
                    <button type="button" className="w-full text-left" onClick={() => void openNotification(n)}>
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
