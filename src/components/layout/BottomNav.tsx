'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Search, Heart, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { MessagesNavBadge } from '@/context/NotificationContext';

type NavItem = {
  href: string;
  labelKey: string;
  Icon: typeof Home;
  match: (p: string) => boolean;
  center?: boolean;
  showMessagesBadge?: boolean;
};

export default function BottomNav() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) setVisible(!!user);
    };
    sync();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setVisible(!!session?.user);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const navItems: NavItem[] = [
    { href: '/', labelKey: 'nav.home', Icon: Home, match: (p) => p === '/' },
    {
      href: '/browse',
      labelKey: 'nav.search',
      Icon: Search,
      match: (p) => p === '/browse' || p.startsWith('/browse'),
    },
    {
      href: '/upload',
      labelKey: 'nav.upload',
      Icon: Plus,
      center: true,
      match: (p) => p === '/upload' || p.startsWith('/upload/'),
    },
    {
      href: '/messages',
      labelKey: 'nav.messages',
      Icon: MessageCircle,
      match: (p) => p === '/messages' || p.startsWith('/messages/'),
      showMessagesBadge: true,
    },
    {
      href: '/favorites',
      labelKey: 'nav.favorites',
      Icon: Heart,
      match: (p) => p === '/favorites' || p.startsWith('/favorites/'),
    },
  ];

  if (!visible || pathname === '/auth' || pathname.startsWith('/messages')) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9980] border-t border-gray-200/90 bg-white/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      aria-label={t('nav.home')}
    >
      <div className="mx-auto flex h-[3.75rem] max-w-lg items-stretch justify-around px-1">
        {navItems.map(({ href, labelKey, Icon, match, center, showMessagesBadge }) => {
          const active = match(pathname);
          const label = t(labelKey);

          if (center) {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="flex min-w-0 flex-1 flex-col items-center justify-center"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#007782] text-white shadow-md hover:bg-[#006670]">
                  <Icon size={24} strokeWidth={2.25} />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors',
                active ? 'text-[#007782]' : 'text-gray-500 hover:text-gray-800',
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.25 : 1.85} className="shrink-0" />
              {showMessagesBadge ? (
                <MessagesNavBadge className="top-0 right-[calc(50%-18px)] h-2.5 w-2.5" />
              ) : null}
              <span
                className={cn(
                  'text-[10px] font-semibold leading-none',
                  active && 'text-[#007782]',
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
