'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Heart, User, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  Icon: typeof Home;
  match: (p: string) => boolean;
  center?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Főoldal', Icon: Home, match: (p) => p === '/' },
  {
    href: '/favorites',
    label: 'Kedvencek',
    Icon: Heart,
    match: (p) => p === '/favorites' || p.startsWith('/favorites/'),
  },
  {
    href: '/upload',
    label: 'Feltöltés',
    Icon: Plus,
    center: true,
    match: (p) => p === '/upload' || p.startsWith('/upload/'),
  },
  {
    href: '/messages',
    label: 'Üzenetek',
    Icon: MessageCircle,
    match: (p) => p === '/messages' || p.startsWith('/messages/'),
  },
  {
    href: '/profile',
    label: 'Profil',
    Icon: User,
    match: (p) => p === '/profile' || p.startsWith('/profile/'),
  },
];

export default function BottomNav() {
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

  if (!visible || pathname === '/auth' || pathname.startsWith('/messages')) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9980] border-t border-gray-200/90 bg-white/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      aria-label="Alsó navigáció"
    >
      <div className="mx-auto flex h-[3.75rem] max-w-lg items-stretch justify-around px-1">
        {NAV_ITEMS.map(({ href, label, Icon, match, center }) => {
          const active = match(pathname);
          if (center) {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="flex min-w-0 flex-1 flex-col items-center justify-center"
              >
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-colors',
                    active
                      ? 'bg-[#007782] text-white'
                      : 'bg-[#007782] text-white hover:bg-[#006670]',
                  )}
                >
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
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors',
                active ? 'text-[#007782]' : 'text-gray-500 hover:text-gray-800',
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.25 : 1.85} className="shrink-0" />
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
