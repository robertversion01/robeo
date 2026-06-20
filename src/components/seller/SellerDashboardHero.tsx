'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Package, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { fetchUnreadCount } from '@/lib/unreadNotifications';
import { cn } from '@/lib/utils';

const SELLER_PENDING_TX = [
  'payment_pending',
  'fizetve',
  'feladva',
  'uton',
  'atvetelre_var',
  'local_pickup_pending',
];

type Props = {
  sellerId: string;
  activeListings: number;
  listingFavorites: number;
  className?: string;
};

export default function SellerDashboardHero({
  sellerId,
  activeListings,
  listingFavorites,
  className,
}: Props) {
  const { t } = useTranslation();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [unread, txRes] = await Promise.all([
        fetchUnreadCount(supabase, sellerId),
        supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', sellerId)
          .in('status', SELLER_PENDING_TX),
      ]);
      if (!cancelled) {
        setUnreadMessages(unread);
        setPendingOrders(txRes.count ?? 0);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const cards = [
    {
      href: '/messages',
      icon: MessageCircle,
      title: t('seller.dashboard.newMessages'),
      value: unreadMessages,
      hint: unreadMessages > 0 ? t('seller.dashboard.newMessagesHint') : t('seller.dashboard.allCaughtUp'),
      accent: unreadMessages > 0,
    },
    {
      href: '/orders',
      icon: Package,
      title: t('seller.dashboard.newOrders'),
      value: pendingOrders,
      hint:
        pendingOrders > 0
          ? t('seller.dashboard.newOrdersHint')
          : t('seller.dashboard.noPendingOrders'),
      accent: pendingOrders > 0,
    },
    {
      href: '/profile?tab=shop',
      icon: TrendingUp,
      title: t('seller.dashboard.listings'),
      value: activeListings,
      hint: t('seller.dashboard.listingsHint', { favorites: listingFavorites }),
      accent: listingFavorites > 0,
    },
  ];

  return (
    <div className={cn('mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3', className)}>
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className={cn(
            'rounded-xl border p-3 transition-colors',
            card.accent
              ? 'border-[#38c7d0]/35 bg-[#17343a]/40 hover:bg-[#17343a]/60'
              : 'border-[#2a3941] bg-[#141d21] hover:border-[#38c7d0]/25',
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a2328] text-[#38c7d0]">
              <card.icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#8fa3ad]">
                {card.title}
              </span>
              <span className="mt-0.5 block text-xl font-bold tabular-nums text-[#e7edf0]">
                {card.value}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-[#9aadb5]">{card.hint}</span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
