'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Heart, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Főoldal', Icon: Home, match: (p: string) => p === '/' },
  {
    href: '/messages',
    label: 'Üzenetek',
    Icon: MessageCircle,
    match: (p: string) => p === '/messages' || p.startsWith('/messages/'),
  },
  {
    href: '/favorites',
    label: 'Kedvencek',
    Icon: Heart,
    match: (p: string) => p === '/favorites' || p.startsWith('/favorites/'),
  },
  {
    href: '/profile',
    label: 'Profil',
    Icon: User,
    match: (p: string) => p === '/profile' || p.startsWith('/profile/'),
  },
] as const;

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
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9980] border-t border-gray-200/90 bg-white/85 backdrop-blur-lg supports-[backdrop-filter]:bg-white/75 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Alsó navigáció"
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
        {NAV_ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors',
                active ? 'text-[#007782]' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.25 : 1.85}
                className={cn('shrink-0', active && 'drop-shadow-sm')}
              />
              <span className={cn('text-[10px] font-semibold leading-none', active && 'text-[#007782]')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
