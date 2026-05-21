import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { fetchProfileRow } from '@/lib/supabaseResilience';

export const ADMIN_ROLE = 'admin';
export const DEFAULT_USER_ROLE = 'user';

export type UserRole = typeof ADMIN_ROLE | typeof DEFAULT_USER_ROLE | string;

export function isAdminRole(role: string | null | undefined): boolean {
  return (role ?? '').trim().toLowerCase() === ADMIN_ROLE;
}

/** profiles.role vagy auth user_metadata.role */
export function resolveRoleFromSources(
  profileRole: string | null | undefined,
  metadata?: Record<string, unknown> | null,
): UserRole {
  const fromMeta = metadata?.role;
  if (typeof fromMeta === 'string' && fromMeta.trim()) {
    return fromMeta.trim().toLowerCase();
  }
  if (typeof profileRole === 'string' && profileRole.trim()) {
    return profileRole.trim().toLowerCase();
  }
  return DEFAULT_USER_ROLE;
}

export async function fetchUserRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserRole> {
  const profile = await fetchProfileRow<{ role?: string | null }>(supabase, userId, [
    'role',
    'id, role',
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta =
    user?.id === userId
      ? (user.user_metadata as Record<string, unknown>)
      : undefined;

  if (!meta && supabase.auth.admin?.getUserById) {
    const { data } = await supabase.auth.admin.getUserById(userId);
    return resolveRoleFromSources(profile?.role, data?.user?.user_metadata as Record<string, unknown>);
  }

  return resolveRoleFromSources(profile?.role, meta);
}

export async function isUserAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const role = await fetchUserRole(supabase, userId);
  return isAdminRole(role);
}

export type AdminAuthResult =
  | { ok: true; userId: string; user: User; role: UserRole }
  | { ok: false; res: NextResponse };

/**
 * Bearer token → Supabase user → role check (profiles + metadata).
 * Service role client optional for profile read when session user matches.
 */
export async function assertAdminRequest(req: NextRequest): Promise<AdminAuthResult> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, res: NextResponse.json({ error: 'Auth config missing' }, { status: 500 }) };
  }

  const authClient = createClient(url, anon);
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) {
    return { ok: false, res: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }

  const metaRole = (user.user_metadata as Record<string, unknown> | undefined)?.role;
  let role = resolveRoleFromSources(undefined, { role: metaRole });

  if (!isAdminRole(role)) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const adminDb = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      role = await fetchUserRole(adminDb, user.id);
    } else {
      role = await fetchUserRole(authClient, user.id);
    }
  }

  if (!isAdminRole(role)) {
    return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, userId: user.id, user, role };
}
