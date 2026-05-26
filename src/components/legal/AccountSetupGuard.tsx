'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  isProfileRegistrationComplete,
  needsLegalReaccept,
} from '@/lib/profileRegistration';

const SKIP_PREFIXES = ['/auth', '/api'];
const LEGAL_PUBLIC_PREFIXES = ['/legal/terms', '/legal/privacy', '/legal/cookies', '/legal/pay'];

function shouldSkip(pathname: string | null): boolean {
  if (!pathname) return true;
  if (SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return LEGAL_PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Bejelentkezett user: profil kitöltés + frissített ÁSZF elfogadás kényszerítése. */
export default function AccountSetupGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (shouldSkip(pathname)) return;

    let cancelled = false;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, name, legal_accepted_at, legal_version')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!isProfileRegistrationComplete(profile)) {
        router.replace('/auth/complete');
        return;
      }

      if (needsLegalReaccept(profile)) {
        router.replace('/legal/reaccept');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return children;
}
