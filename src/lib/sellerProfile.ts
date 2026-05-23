import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchProfileRow } from '@/lib/supabaseResilience';

export type SellerDisplayProfile = {
  email: string | null;
  name: string | null;
  full_name?: string | null;
  bio?: string | null;
};

/** Rugalmas eladó profil — full_name hiányában is működik. */
export async function fetchSellerDisplayProfile(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerDisplayProfile | null> {
  return fetchProfileRow<SellerDisplayProfile>(supabase, sellerId, [
    'email, name',
    'email, name, full_name',
    'email, name, bio',
    'email, name, full_name, bio',
    'email',
  ]);
}

export function getSellerDisplayName(profile: SellerDisplayProfile | null): string {
  if (!profile) return 'Eladó';
  const fromUsername = profile.name?.trim();
  if (fromUsername) return fromUsername;
  const email = profile.email?.trim();
  if (email) return email.split('@')[0] || 'Eladó';
  return 'Eladó';
}
