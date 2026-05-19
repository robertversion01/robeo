'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  getSaleNotificationDedupeKey,
  tryConsumeSaleNotificationSlot,
} from '@/lib/salePopupDedupe';
import { supabase } from '@/lib/supabase';
import {
  fetchUnreadCount,
  offerAmountFromRow,
  writeLastSeenAt,
} from '@/lib/unreadNotifications';
import OfferNotificationPopup from '@/components/notifications/OfferNotificationPopup';
import SaleNotificationPopup from '@/components/notifications/SaleNotificationPopup';
import SaleToastContent from '@/components/notifications/SaleToastContent';
import {
  isSaleSystemMessage,
  type IncomingSaleAlert,
} from '@/lib/saleNotifications';
import { buildSaleAlertPayload } from '@/lib/presentSaleNotification';
import {
  emitSaleCompletedBroadcast,
  ROBEO_GLOBAL_EVENTS_CHANNEL,
  SALE_COMPLETED_BROADCAST_EVENT,
  type SaleCompletedBroadcastPayload,
} from '@/lib/globalEvents';
import { toast } from 'sonner';

/**
 * Supabase Dashboard → Database → Publications → supabase_realtime:
 * pipáld be a `public.offers` és `public.messages` táblákat (Replication).
 * Vagy futtasd: supabase/patch-realtime-replication.sql
 */

export type IncomingOfferAlert = {
  offerId: string;
  productId: string;
  productName: string;
  amountHuf: number;
};

export type { IncomingSaleAlert } from '@/lib/saleNotifications';

type NotificationContextValue = {
  unreadCount: number;
  hasUnread: boolean;
  refreshUnread: () => Promise<void>;
  markMessagesSeen: () => void;
  dismissOfferAlert: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      unreadCount: 0,
      hasUnread: false,
      refreshUnread: async () => {},
      markMessagesSeen: () => {},
      dismissOfferAlert: () => {},
    };
  }
  return ctx;
}

function MessagesBadgeDot({ className = '' }: { className?: string }) {
  return (
    <span
      className={`absolute rounded-full bg-red-500 border-2 border-white ${className}`}
      aria-hidden
    />
  );
}

export function MessagesNavBadge({
  className = 'top-0.5 right-0.5 h-2.5 w-2.5',
}: {
  className?: string;
}) {
  const { hasUnread } = useNotifications();
  if (!hasUnread) return null;
  return <MessagesBadgeDot className={className} />;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [offerAlert, setOfferAlert] = useState<IncomingOfferAlert | null>(null);
  const [saleAlert, setSaleAlert] = useState<IncomingSaleAlert | null>(null);
  const userIdRef = useRef<string | null>(null);
  const activeSaleDedupeKeyRef = useRef<string | null>(null);
  userIdRef.current = userId;

  const refreshUnread = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) {
      setUnreadCount(0);
      return;
    }
    const count = await fetchUnreadCount(supabase, uid);
    setUnreadCount(count);
  }, []);

  const markMessagesSeen = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid) return;
    writeLastSeenAt(uid);
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent('messages:seen'));
  }, []);

  const dismissOfferAlert = useCallback(() => setOfferAlert(null), []);
  const dismissSaleAlert = useCallback(() => {
    setSaleAlert(null);
    activeSaleDedupeKeyRef.current = null;
  }, []);

  const showOfferAlert = useCallback(
    async (row: Record<string, unknown>) => {
      const uid = userIdRef.current;
      if (!uid || row.seller_id !== uid) return;
      if (row.status && row.status !== 'pending') return;

      const productId = String(row.product_id ?? '');
      let productName = 'termékedre';
      if (productId) {
        const { data: product } = await supabase
          .from('products')
          .select('name')
          .eq('id', productId)
          .maybeSingle();
        if (product?.name) productName = product.name;
      }

      const amountHuf = offerAmountFromRow(row);
      const alert: IncomingOfferAlert = {
        offerId: String(row.id ?? ''),
        productId,
        productName,
        amountHuf,
      };

      setOfferAlert(alert);
      void refreshUnread();

      toast.info(`Új ajánlat: ${amountHuf.toLocaleString('hu-HU')} Ft`, {
        description: productName,
        duration: 5000,
      });
    },
    [refreshUnread],
  );

  const presentSaleNotification = useCallback(
    (alert: IncomingSaleAlert) => {
      const dedupeKey = getSaleNotificationDedupeKey(alert);
      if (!tryConsumeSaleNotificationSlot(dedupeKey)) {
        return;
      }

      if (activeSaleDedupeKeyRef.current === dedupeKey) {
        return;
      }
      activeSaleDedupeKeyRef.current = dedupeKey;

      setSaleAlert(alert);
      void refreshUnread();

      toast.success('Gratulálunk! Sikeres eladás', {
        id: `sale-toast-${dedupeKey}`,
        description: <SaleToastContent alert={alert} />,
        duration: 9000,
      });
    },
    [refreshUnread],
  );

  const showSaleAlert = useCallback(
    async (row: Record<string, unknown>) => {
      const uid = userIdRef.current;
      if (!uid || row.receiver_id !== uid) return;

      const content = String(row.content ?? '');
      const messageType = row.message_type as string | undefined;
      if (!isSaleSystemMessage(content, messageType)) return;

      const productId = String(row.product_id ?? '');
      let productName = 'a terméked';
      if (productId) {
        const { data: product } = await supabase
          .from('products')
          .select('name')
          .eq('id', productId)
          .maybeSingle();
        if (product?.name) productName = product.name;
      }

      presentSaleNotification(
        buildSaleAlertPayload(productId, productName, {
          messageId: row.id ? String(row.id) : undefined,
          buyerId: String(row.sender_id ?? ''),
        }),
      );
    },
    [presentSaleNotification],
  );

  const handleSaleBroadcast = useCallback(
    (payload: SaleCompletedBroadcastPayload) => {
      const uid = userIdRef.current;
      if (!uid || payload.sellerId !== uid) return;
      presentSaleNotification(
        buildSaleAlertPayload(payload.productId, payload.productName, {
          messageId: payload.transactionId,
          buyerId: payload.buyerId,
        }),
      );
    },
    [presentSaleNotification],
  );

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      if (user?.id) await fetchUnreadCount(supabase, user.id).then(setUnreadCount);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null;
      setUserId(id);
      if (!id) {
        setUnreadCount(0);
        setOfferAlert(null);
        setSaleAlert(null);
      } else {
        void fetchUnreadCount(supabase, id).then(setUnreadCount);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    void refreshUnread();

    const channel = supabase
      .channel(`robeo-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offers',
          filter: `seller_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          void showOfferAlert(row);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const content = String(row.content ?? '');
          const messageType = row.message_type as string | undefined;
          if (isSaleSystemMessage(content, messageType)) {
            void showSaleAlert(row);
          }
          void refreshUnread();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers',
          filter: `buyer_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.status === 'countered') void refreshUnread();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers',
          filter: `seller_id=eq.${userId}`,
        },
        () => {
          void refreshUnread();
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(
            '[NotificationProvider] Realtime channel error — ellenőrizd a Supabase Replication beállítást (offers, messages).',
          );
        }
      });

    const globalChannel = supabase
      .channel(ROBEO_GLOBAL_EVENTS_CHANNEL)
      .on(
        'broadcast',
        { event: SALE_COMPLETED_BROADCAST_EVENT },
        ({ payload }) => {
          handleSaleBroadcast(payload as SaleCompletedBroadcastPayload);
        },
      )
      .subscribe();

    const onSeen = () => void refreshUnread();
    const onOffersUpdated = () => void refreshUnread();
    const onLocalSaleBroadcast = (e: Event) => {
      const detail = (e as CustomEvent<SaleCompletedBroadcastPayload>).detail;
      if (detail) handleSaleBroadcast(detail);
    };

    window.addEventListener('messages:seen', onSeen);
    window.addEventListener('offers:updated', onOffersUpdated);
    window.addEventListener('robeo:sale-broadcast', onLocalSaleBroadcast);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(globalChannel);
      window.removeEventListener('messages:seen', onSeen);
      window.removeEventListener('offers:updated', onOffersUpdated);
      window.removeEventListener('robeo:sale-broadcast', onLocalSaleBroadcast);
    };
  }, [userId, refreshUnread, showOfferAlert, showSaleAlert, handleSaleBroadcast]);

  useEffect(() => {
    if (pathname?.startsWith('/messages') && userId) {
      markMessagesSeen();
    }
  }, [pathname, userId, markMessagesSeen]);

  const value = useMemo(
    () => ({
      unreadCount,
      hasUnread: unreadCount > 0,
      refreshUnread,
      markMessagesSeen,
      dismissOfferAlert,
    }),
    [unreadCount, refreshUnread, markMessagesSeen, dismissOfferAlert],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <SaleNotificationPopup alert={saleAlert} onDismiss={dismissSaleAlert} />
      <OfferNotificationPopup alert={offerAlert} onDismiss={dismissOfferAlert} />
    </NotificationContext.Provider>
  );
}
