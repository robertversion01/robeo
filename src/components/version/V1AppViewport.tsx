'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import MobileShellNav from '@/components/layout/MobileShellNav';
import ImmersiveBrowseChrome from '@/components/browse/ImmersiveBrowseChrome';
import { NotificationProvider } from '@/context/NotificationContext';
import { ImmersiveBrowseProvider, useImmersiveBrowse } from '@/context/ImmersiveBrowseContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { MOBILE_WRAPPER_BOTTOM_PAD } from '@/lib/layoutTokens';
import { shouldPadForMobileBottomNav } from '@/lib/navVisibility';

function V1AppViewportInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
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

  const showMobileBottomPad = shouldPadForMobileBottomNav(pathname, loggedIn);

  return (
    <NotificationProvider>
      <Navbar />
      <div
        className={cn(
          'min-h-0 flex-1 transition-[padding] duration-300 ease-out',
          showMobileBottomPad && MOBILE_WRAPPER_BOTTOM_PAD,
        )}
      >
        {children}
      </div>
      <MobileShellNav />
      <ImmersiveBrowseChrome />
    </NotificationProvider>
  );
}

export default function V1AppViewport({ children }: { children: React.ReactNode }) {
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

  return (
    <ImmersiveBrowseProvider loggedIn={loggedIn}>
      <V1AppViewportInner>{children}</V1AppViewportInner>
    </ImmersiveBrowseProvider>
  );
}
