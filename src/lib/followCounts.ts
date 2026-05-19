import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseSchemaError } from '@/lib/supabaseResilience';

export type FollowCounts = {
  followers: number;
  following: number;
};

const EMPTY: FollowCounts = { followers: 0, following: 0 };

export async function fetchFollowCounts(
  supabase: SupabaseClient,
  userId: string,
): Promise<FollowCounts> {
  try {
    const [followersRes, followingRes] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId),
    ]);

    if (followersRes.error && !isSupabaseSchemaError(followersRes.error)) {
      console.warn('[follows] followers count', followersRes.error.message);
    }
    if (followingRes.error && !isSupabaseSchemaError(followingRes.error)) {
      console.warn('[follows] following count', followingRes.error.message);
    }

    if (
      isSupabaseSchemaError(followersRes.error) ||
      isSupabaseSchemaError(followingRes.error)
    ) {
      return EMPTY;
    }

    return {
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    };
  } catch {
    return EMPTY;
  }
}
