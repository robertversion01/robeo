import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_BIO_LENGTH = 280;

export async function loadProfileBio(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('bio')
    .eq('id', userId)
    .maybeSingle();

  if (error?.message?.includes('bio') && error.message.includes('does not exist')) {
    return '';
  }
  if (error || !data) return '';
  return typeof data.bio === 'string' ? data.bio.trim() : '';
}

export async function saveProfileBio(
  supabase: SupabaseClient,
  userId: string,
  bio: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = bio.trim().slice(0, MAX_BIO_LENGTH);
  const { error } = await supabase.from('profiles').update({ bio: trimmed || null }).eq('id', userId);

  if (error) {
    if (error.message?.includes('bio') && error.message.includes('does not exist')) {
      return { ok: false, error: 'bio_column_missing' };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
