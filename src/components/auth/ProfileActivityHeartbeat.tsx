'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { pingProfileActivity } from '@/lib/profileActivity';
import { isMobileViewport, runWhenIdle } from '@/lib/mobilePerf';

/** Bejelentkezett user utolsó aktivitásának frissítése (throttled). */
export default function ProfileActivityHeartbeat() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      await pingProfileActivity(supabase, user.id);
    };

    const start = () => {
      if (cancelled) return;
      void run();
    };

    const bootDelay = isMobileViewport() ? 12_000 : 0;
    const bootTimer = window.setTimeout(() => {
      if (isMobileViewport()) {
        runWhenIdle(start, 4000);
      } else {
        start();
      }
    }, bootDelay);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(() => void run(), 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
