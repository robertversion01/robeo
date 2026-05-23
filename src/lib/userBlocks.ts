import type { SupabaseClient } from '@supabase/supabase-js';

export type BlockCheckResult = {
  blockedByMe: boolean;
  blockedByThem: boolean;
  eitherBlocked: boolean;
};

export async function fetchMyBlockedUserIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);

  if (error) {
    if (error.message?.includes('user_blocks') && error.message.includes('does not exist')) {
      return new Set();
    }
    console.warn('[userBlocks] fetch blocked failed', error.message);
    return new Set();
  }

  return new Set((data || []).map((row) => String(row.blocked_id)));
}

export async function checkBlockBetween(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string,
): Promise<BlockCheckResult> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`,
    );

  if (error) {
    if (error.message?.includes('user_blocks') && error.message.includes('does not exist')) {
      return { blockedByMe: false, blockedByThem: false, eitherBlocked: false };
    }
    return { blockedByMe: false, blockedByThem: false, eitherBlocked: false };
  }

  let blockedByMe = false;
  let blockedByThem = false;
  for (const row of data || []) {
    if (row.blocker_id === userId && row.blocked_id === otherUserId) blockedByMe = true;
    if (row.blocker_id === otherUserId && row.blocked_id === userId) blockedByThem = true;
  }

  return {
    blockedByMe,
    blockedByThem,
    eitherBlocked: blockedByMe || blockedByThem,
  };
}

export async function blockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (blockerId === blockedId) {
    return { ok: false, error: 'self_block' };
  }

  const { error } = await supabase.from('user_blocks').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });

  if (error) {
    if (error.code === '23505') return { ok: true };
    if (error.message?.includes('user_blocks') && error.message.includes('does not exist')) {
      return { ok: false, error: 'schema_missing' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function unblockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);

  if (error) {
    if (error.message?.includes('user_blocks') && error.message.includes('does not exist')) {
      return { ok: false, error: 'schema_missing' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
