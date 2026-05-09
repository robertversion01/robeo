'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import { BrowseProvider } from '@/context/BrowseContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

/** Mobil alsó nav (~56px) + safe area — ha a BottomNav látható */
const MOBILE_BOTTOM_NAV_PAD =
  'pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-0';

/** Chat oldal: alsó sáv nincs (üzenetmező), így ne nyomjunk üres paddinget */
function bottomNavSuppressedPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === '/auth' || pathname.startsWith('/messages');
}

export default function AppChrome({ children }: { children: React.ReactNode }) {
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
    loggedIn && !bottomNavSuppressedPath(pathname);

  return (
    <BrowseProvider>
      <div className="flex w-full min-h-0 flex-1 flex-col">
        <Navbar />
        <div
          className={cn('min-h-0 flex-1', showMobileBottomPad && MOBILE_BOTTOM_NAV_PAD)}
        >
          {children}
        </div>
        <BottomNav />
      </div>
    </BrowseProvider>
  );
}
