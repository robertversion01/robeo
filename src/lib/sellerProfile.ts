import type { SupabaseClient } from '@supabase/supabase-js';

export type SellerDisplayProfile = {
  email: string | null;
  name: string | null;
  full_name: string | null;
};

/** Resilient seller profile fetch (avoids 400 when optional columns are missing on DB). */
export async function fetchSellerDisplayProfile(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerDisplayProfile | null> {
  const attempts: string[] = ['email, name, full_name', 'email, name', 'email'];

  for (const columns of attempts) {
    const { data, error } = await supabase
      .from('profiles')
      .select(columns)
      .eq('id', sellerId)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as SellerDisplayProfile;
    }

    const msg = error?.message?.toLowerCase() ?? '';
    const missingColumn =
      error?.code === '42703' ||
      msg.includes('column') ||
      msg.includes('does not exist') ||
      error?.code === 'PGRST204';

    if (!missingColumn) {
      console.warn('[sellerProfile] profiles select failed', error?.message);
      return null;
    }
  }

  return null;
}

export function getSellerDisplayName(profile: SellerDisplayProfile | null): string {
  if (!profile) return 'Eladó';
  const fromName = profile.full_name?.trim() || profile.name?.trim();
  if (fromName) return fromName;
  const email = profile.email?.trim();
  if (email) return email.split('@')[0] || 'Eladó';
  return 'Eladó';
}
