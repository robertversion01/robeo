'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Search, User, Plus, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { FeedNavBadge, MessagesNavBadge } from '@/context/NotificationContext';
import { useImmersiveBrowse } from '@/context/ImmersiveBrowseContext';
import { shouldShowMobileBottomNav } from '@/lib/navVisibility';

/** Hacoo-szerű 5 tab: Főoldal | Keresés | Feltöltés | Üzenetek | Profil */
const LOGGED_IN_TABS = [
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
    href: '/profile',
    labelKey: 'nav.profile',
    Icon: User,
    match: (p: string) => p.startsWith('/profile'),
    feedBadge: true,
  },
] as const;

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
        className="md:hidden fixed bottom-0 left-0 right-0 z-[9980] border-t border-gray-200/80 bg-white pb-[env(safe-area-inset-bottom,0px)]"
        aria-label={t('nav.home')}
      >
        <div className="mx-auto grid h-14 max-w-lg grid-cols-3 items-center px-4">
          <Link
            href="/"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1',
              pathname === '/' ? 'text-[#007782]' : 'text-gray-500',
            )}
          >
            <Home size={24} strokeWidth={pathname === '/' ? 2.25 : 1.75} />
          </Link>
          <Link
            href="/browse"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1',
              pathname.startsWith('/browse') ? 'text-[#007782]' : 'text-gray-500',
            )}
          >
            <Search size={24} strokeWidth={pathname.startsWith('/browse') ? 2.25 : 1.75} />
          </Link>
          <Link
            href="/auth?view=sign_in"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1',
              pathname.startsWith('/auth') ? 'text-[#007782]' : 'text-gray-500',
            )}
          >
            <LogIn size={24} strokeWidth={pathname.startsWith('/auth') ? 2.25 : 1.75} />
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-[9980] border-t bg-white pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-300 ease-out will-change-transform',
        shellChromeHidden
          ? 'translate-y-full border-transparent shadow-none pointer-events-none'
          : 'translate-y-0 border-gray-200/80 shadow-[0_-1px_0_rgba(0,0,0,0.06)]',
      )}
      aria-label={t('nav.home')}
    >
      <div className="mx-auto grid h-14 max-w-lg grid-cols-5 items-end px-2">
        {LOGGED_IN_TABS.map((item) => {
          const active = item.match(pathname);
          const label = t(item.labelKey);

          if ('center' in item && item.center) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={label}
                className="relative flex flex-col items-center justify-end pb-1.5"
              >
                <span
                  className={cn(
                    'flex h-11 w-11 -translate-y-2 items-center justify-center rounded-2xl text-white shadow-md ring-[3px] ring-white',
                    active ? 'bg-[#006670]' : 'bg-[#007782]',
                  )}
                >
                  <item.Icon size={22} strokeWidth={2.5} />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 py-2',
                active ? 'text-[#007782]' : 'text-gray-500',
              )}
            >
              <item.Icon size={24} strokeWidth={active ? 2.25 : 1.75} />
              {'messagesBadge' in item && item.messagesBadge ? (
                <MessagesNavBadge className="top-0.5 right-[calc(50%-20px)]" />
              ) : null}
              {'feedBadge' in item && item.feedBadge ? (
                <FeedNavBadge className="top-0.5 right-[calc(50%-20px)]" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
