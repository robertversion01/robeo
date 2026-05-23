'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Search, User, Plus, LogIn, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { FeedNavBadge, MessagesNavBadge } from '@/context/NotificationContext';
import { useImmersiveBrowse } from '@/context/ImmersiveBrowseContext';
import { shouldShowMobileBottomNav } from '@/lib/navVisibility';

export default function MobileShellNav() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const { shellChromeHidden } = useImmersiveBrowse();

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) setLoggedIn(!!user);
    };
    sync();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (loggedIn === null) return null;
  if (!shouldShowMobileBottomNav(pathname, loggedIn)) return null;

  if (!loggedIn) {
    return (
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[9980] border-t border-gray-200/90 bg-white/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        aria-label={t('nav.home')}
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
          <Link
            href="/"
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5',
              pathname === '/' ? 'text-[#007782]' : 'text-gray-500',
            )}
          >
            <Home size={22} />
            <span className="max-w-[4.5rem] truncate text-[10px] font-semibold">{t('nav.home')}</span>
          </Link>
          <Link
            href="/browse"
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5',
              pathname.startsWith('/browse') ? 'text-[#007782]' : 'text-gray-500',
            )}
          >
            <Search size={22} />
            <span className="max-w-[4.5rem] truncate text-[10px] font-semibold">{t('nav.search')}</span>
          </Link>
          <Link
            href="/auth?view=sign_in"
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5',
              pathname.startsWith('/auth') ? 'text-[#007782]' : 'text-gray-500',
            )}
          >
            <LogIn size={22} />
            <span className="max-w-[4.5rem] truncate text-[10px] font-semibold">{t('nav.login')}</span>
          </Link>
        </div>
      </nav>
    );
  }

  const items = [
    { href: '/', labelKey: 'nav.home', Icon: Home, match: (p: string) => p === '/' },
    {
      href: '/browse',
      labelKey: 'nav.search',
      Icon: Search,
      match: (p: string) => p.startsWith('/browse'),
    },
    {
      href: '/upload',
      labelKey: 'nav.upload',
      Icon: Plus,
      center: true,
      match: (p: string) => p.startsWith('/upload'),
    },
    {
      href: '/messages',
      labelKey: 'nav.messages',
      Icon: MessageCircle,
      match: (p: string) => p.startsWith('/messages'),
      messagesBadge: true,
    },
    {
      href: '/orders',
      labelKey: 'nav.orders',
      Icon: Package,
      match: (p: string) => p.startsWith('/orders'),
    },
    {
      href: '/profile',
      labelKey: 'nav.profile',
      Icon: User,
      match: (p: string) => p.startsWith('/profile'),
      feedBadge: true,
    },
  ] as const;

  return (
    <nav
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-[9980] border-t pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-300 ease-out will-change-transform',
        shellChromeHidden
          ? 'translate-y-full border-transparent bg-transparent shadow-none pointer-events-none'
          : 'translate-y-0 border-gray-200/90 bg-white/95 backdrop-blur-lg shadow-[0_-4px_24px_rgba(0,0,0,0.06)]',
      )}
      aria-label={t('nav.home')}
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1.5">
        {items.map((item) => {
          const active = item.match(pathname);
          const label = t(item.labelKey);

          if ('center' in item && item.center) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={label}
                className="flex min-w-0 flex-1 flex-col items-center justify-center"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-md">
                  <item.Icon size={22} strokeWidth={2.25} />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5',
                active ? 'text-gray-900' : 'text-gray-500',
              )}
            >
              <item.Icon size={22} strokeWidth={active ? 2.25 : 1.85} />
              {'messagesBadge' in item && item.messagesBadge ? (
                <MessagesNavBadge className="top-0 right-[calc(50%-22px)]" />
              ) : null}
              {'feedBadge' in item && item.feedBadge ? (
                <FeedNavBadge className="top-0 right-[calc(50%-22px)]" />
              ) : null}
              <span className="max-w-[3.75rem] truncate text-[10px] font-semibold leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
