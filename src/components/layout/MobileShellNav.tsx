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
  const [messagesThreadOpen, setMessagesThreadOpen] = useState(false);
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

  // Megnyitott beszélgetésben (mobil) full-screen chat → nincs alsó nav.
  useEffect(() => {
    const sync = () => {
      if (typeof window === 'undefined') return;
      const open =
        pathname.startsWith('/messages') &&
        !!new URLSearchParams(window.location.search).get('with');
      setMessagesThreadOpen(open);
    };
    sync();
    window.addEventListener('messages:thread-changed', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('messages:thread-changed', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [pathname]);

  if (loggedIn === null) return null;
  if (!shouldShowMobileBottomNav(pathname, loggedIn)) return null;
  if (messagesThreadOpen) return null;

  if (!loggedIn) {
    return (
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[9980] border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom,0px)]"
        aria-label={t('nav.home')}
      >
        <div className="mx-auto grid h-[3.25rem] max-w-lg grid-cols-3 items-center px-6">
          <Link
            href="/"
            aria-label={t('nav.home')}
            className={cn(
              'flex items-center justify-center py-2',
              pathname === '/' ? 'text-[#007782]' : 'text-gray-400',
            )}
          >
            <Home size={22} strokeWidth={pathname === '/' ? 2.5 : 1.75} />
          </Link>
          <Link
            href="/browse"
            aria-label={t('nav.search')}
            className={cn(
              'flex items-center justify-center py-2',
              pathname.startsWith('/browse') ? 'text-[#007782]' : 'text-gray-400',
            )}
          >
            <Search size={22} strokeWidth={pathname.startsWith('/browse') ? 2.5 : 1.75} />
          </Link>
          <Link
            href="/auth?view=sign_in"
            aria-label={t('nav.login')}
            className={cn(
              'flex items-center justify-center py-2',
              pathname.startsWith('/auth') ? 'text-[#007782]' : 'text-gray-400',
            )}
          >
            <LogIn size={22} strokeWidth={pathname.startsWith('/auth') ? 2.5 : 1.75} />
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-[9980] border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-300 ease-out will-change-transform',
        shellChromeHidden && 'translate-y-full pointer-events-none',
      )}
      aria-label={t('nav.home')}
    >
      <div className="mx-auto grid h-[3.75rem] max-w-lg grid-cols-5 items-stretch px-1">
        {LOGGED_IN_TABS.map((item) => {
          const active = item.match(pathname);
          const label = t(item.labelKey);

          if ('center' in item && item.center) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={label}
                className="flex flex-col items-center justify-center"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#007782] text-white shadow-sm">
                  <item.Icon size={20} strokeWidth={2.5} />
                </span>
                <span className="mt-0.5 text-[10px] font-semibold leading-none text-[#007782]">
                  {label}
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
                'relative flex flex-col items-center justify-center gap-0.5 py-1.5',
                active ? 'text-[#007782]' : 'text-gray-400',
              )}
            >
              <item.Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              {'messagesBadge' in item && item.messagesBadge ? (
                <MessagesNavBadge className="top-0.5 right-[calc(50%-18px)]" />
              ) : null}
              {'feedBadge' in item && item.feedBadge ? (
                <FeedNavBadge className="top-0.5 right-[calc(50%-18px)]" />
              ) : null}
              <span
                className={cn(
                  'text-[10px] font-semibold leading-none',
                  active ? 'text-[#007782]' : 'text-gray-500',
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
