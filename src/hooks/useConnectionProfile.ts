'use client';

import { useEffect, useState } from 'react';
import { getConnectionProfile, type ConnectionProfile } from '@/lib/connectionProfile';

export function useConnectionProfile(): ConnectionProfile {
  const [profile, setProfile] = useState<ConnectionProfile>('fast');

  useEffect(() => {
    setProfile(getConnectionProfile());
    const nav = navigator as Navigator & {
      connection?: { addEventListener?: (t: string, fn: () => void) => void; removeEventListener?: (t: string, fn: () => void) => void };
    };
    const conn = nav.connection;
    if (!conn?.addEventListener) return;
    const sync = () => setProfile(getConnectionProfile());
    conn.addEventListener('change', sync);
    return () => conn.removeEventListener?.('change', sync);
  }, []);

  return profile;
}
