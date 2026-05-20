'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import {
  fetchAppNotifications,
  isNotificationUnread,
  markAllAppNotificationsRead,
  markAppNotificationRead,
  type AppNotificationRow,
} from '@/lib/appNotificationsFeed';
import { useNotifications } from '@/context/NotificationContext';
import PageHeader from '@/components/layout/PageHeader';
import { MAIN_TOP_PADDING, MOBILE_PAGE_BOTTOM_CLASS } from '@/lib/layoutTokens';
import { cn } from '@/lib/utils';

type FilterId = 'all' | 'unread' | 'offers' | 'sales' | 'other';

function formatWhen(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function notificationCategory(row: AppNotificationRow): Exclude<FilterId, 'all'> {
  const type = (row.type || '').toLowerCase();
  const title = (row.title || '').toLowerCase();
  if (type.includes('offer') || title.includes('ajánlat') || title.includes('offer')) return 'offers';
  if (type.includes('sale') || type.includes('sold') || title.includes('elad') || title.includes('sale')) return 'sales';
  return 'other';
}

function matchesFilter(row: AppNotificationRow, filter: FilterId) {
  if (filter === 'all') return true;
  if (filter === 'unread') return isNotificationUnread(row);
  return notificationCategory(row) === filter;
}

export default function AppNotificationsFeed() {
  const { t, i18n } = useTranslation();
  const { refreshUnread } = useNotifications();
  const [items, setItems] = useState<AppNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');

  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';

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

  const filteredItems = useMemo(
    () => items.filter((row) => matchesFilter(row, filter)),
    [items, filter],
  );

  const unreadCount = useMemo(() => items.filter((n) => isNotificationUnread(n)).length, [items]);

  const filterTabs: { id: FilterId; label: string }[] = [
    { id: 'all', label: t('notifications.filterAll') },
    { id: 'unread', label: t('notifications.filterUnread', { count: unreadCount }) },
    { id: 'offers', label: t('notifications.filterOffers') },
    { id: 'sales', label: t('notifications.filterSales') },
    { id: 'other', label: t('notifications.filterOther') },
  ];

  const markAllRead = async () => {
    if (!userId) return;
    await markAllAppNotificationsRead(supabase, userId);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await refreshUnread();
  };

  const openNotification = async (row: AppNotificationRow) => {
    if (isNotificationUnread(row)) {
      await markAppNotificationRead(supabase, row.id);
      setItems((prev) =>
        prev.map((n) => (n.id === row.id ? { ...n, is_read: true } : n)),
      );
      await refreshUnread();
    }
  };

  if (!userId && !loading) {
    return (
      <main className={`min-h-screen bg-white ${MAIN_TOP_PADDING} px-4 ${MOBILE_PAGE_BOTTOM_CLASS}`}>
        <p className="text-center text-gray-600 mt-12">
          <Link href="/auth" className="text-[#007782] font-semibold hover:underline">
            {t('notifications.login')}
          </Link>{' '}
          {t('notifications.loginPrompt')}
        </p>
      </main>
    );
  }

  return (
      <main className={`min-h-screen bg-white ${MAIN_TOP_PADDING} px-4 ${MOBILE_PAGE_BOTTOM_CLASS}`}>
      <div className="max-w-lg mx-auto">
        <PageHeader
          title={t('notifications.title')}
          action={
            items.some((n) => isNotificationUnread(n)) ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#007782]"
              >
                <CheckCheck size={16} />
                {t('notifications.markAllRead')}
              </button>
            ) : (
              <Bell size={20} className="text-[#007782]" aria-hidden />
            )
          }
        />

        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold',
                filter === tab.id
                  ? 'border-[#007782] bg-[#007782] text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 text-center py-8">{t('notifications.loading')}</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">{t('notifications.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {filteredItems.map((n) => {
              const unread = isNotificationUnread(n);
              const inner = (
                <div
                  className={cn(
                    'rounded-xl border p-4 transition-colors',
                    unread
                      ? 'border-[#007782]/30 bg-[#007782]/5'
                      : 'border-gray-200 bg-white',
                  )}
                >
                  <div className="flex items-start gap-2">
                    {unread ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#007782]" aria-hidden />
                    ) : null}
                    <p className="font-semibold text-gray-900 text-sm flex-1">{n.title}</p>
                  </div>
                  {n.body ? <p className="text-sm text-gray-600 mt-1">{n.body}</p> : null}
                  <p className="text-[10px] text-gray-400 mt-2">{formatWhen(n.created_at, locale)}</p>
                </div>
              );

              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link href={n.link} onClick={() => void openNotification(n)}>
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => void openNotification(n)}
                    >
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
