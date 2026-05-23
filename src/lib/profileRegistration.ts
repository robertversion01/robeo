import { LEGAL_VERSION } from '@/lib/legalConstants';

export type ProfileRegistrationFields = {
  full_name?: string | null;
  name?: string | null;
  legal_accepted_at?: string | null;
  legal_version?: string | null;
};

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(normalizeUsername(username));
}

export function isProfileRegistrationComplete(
  profile: ProfileRegistrationFields | null | undefined,
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.full_name?.trim() &&
      profile.name?.trim() &&
      profile.legal_accepted_at,
  );
}

export function suggestUsername(base: string, suffix?: string): string {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 12);
  const tail = suffix ?? String(Math.floor(100 + Math.random() * 900));
  const candidate = `${cleaned || 'user'}${tail}`.slice(0, 20);
  return USERNAME_RE.test(candidate) ? candidate : `user${tail}`;
}

export function usernameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'user';
  return suggestUsername(local);
}

export function needsLegalReaccept(
  profile: ProfileRegistrationFields | null | undefined,
): boolean {
  if (!profile?.legal_accepted_at) return false;
  return profile.legal_version !== LEGAL_VERSION;
}
