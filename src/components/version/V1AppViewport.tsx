'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import MobileShellNav from '@/components/layout/MobileShellNav';
import { NotificationProvider } from '@/context/NotificationContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const MOBILE_BOTTOM_NAV_PAD =
  'pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] md:pb-0';

function bottomNavSuppressedPath(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname === '/auth' ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/upload')
  );
}

function guestNeedsBottomPad(pathname: string | null) {
  if (!pathname) return false;
  return pathname !== '/' && !pathname.startsWith('/auth');
}

/** Next.js (v1) felület: meglévő nav + tartalom + alsó nav. */
export default function V1AppViewport({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

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

  const showMobileBottomPad =
    !bottomNavSuppressedPath(pathname) &&
    (loggedIn || guestNeedsBottomPad(pathname));

  return (
    <NotificationProvider>
      <Navbar />
      <div
        className={cn('min-h-0 flex-1', showMobileBottomPad && MOBILE_BOTTOM_NAV_PAD)}
      >
        {children}
      </div>
      <MobileShellNav />
    </NotificationProvider>
  );
}
