'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchProfileRow } from '@/lib/supabaseResilience';
import { isAdminRole, resolveRoleFromSources } from '@/lib/adminAuth';

export function useIsAdmin(userId: string | null | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(Boolean(userId));

  const refresh = useCallback(async () => {
    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const profile = await fetchProfileRow<{ role?: string | null }>(supabase, userId, [
        'role',
        'id, role',
      ]);
      const role = resolveRoleFromSources(
        profile?.role,
        user?.id === userId ? (user.user_metadata as Record<string, unknown>) : null,
      );
      setIsAdmin(isAdminRole(role));
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isAdmin, loading, refresh };
}
