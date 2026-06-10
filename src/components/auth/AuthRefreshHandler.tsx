'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function isInvalidRefreshTokenError(message: string | undefined): boolean {
  return Boolean(message && /refresh token/i.test(message));
}

/** Lejárt / érvénytelen refresh token esetén csendes kijelentkezés — elkerüli a konzol spamot. */
export default function AuthRefreshHandler() {
  useEffect(() => {
    void supabase.auth.getSession().then(({ error }) => {
      if (isInvalidRefreshTokenError(error?.message)) {
        void supabase.auth.signOut({ scope: 'local' });
      }
    });

    void supabase.auth.getUser().then(({ error }) => {
      if (isInvalidRefreshTokenError(error?.message)) {
        void supabase.auth.signOut({ scope: 'local' });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        void supabase.auth.signOut({ scope: 'local' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
