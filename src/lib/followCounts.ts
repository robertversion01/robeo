import type { SupabaseClient } from '@supabase/supabase-js';

export type FollowCounts = {
  followers: number;
  following: number;
};

export async function fetchFollowCounts(
  supabase: SupabaseClient,
  userId: string,
): Promise<FollowCounts> {
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

  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
}
