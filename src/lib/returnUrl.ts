/** Biztonságos belső returnUrl — csak same-origin relatív útvonal. */

const BLOCKED_PREFIXES = ['/auth', '/api', '/legal/reaccept'];

export function sanitizeReturnUrl(raw: string | null | undefined, fallback = '/'): string {
  if (!raw?.trim()) return fallback;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (BLOCKED_PREFIXES.some((p) => value === p || value.startsWith(`${p}/`))) return fallback;
  return value;
}

export function readReturnUrlFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  return params.get('returnUrl') || params.get('next') || null;
}

export function appendReturnUrl(path: string, returnUrl: string | null | undefined): string {
  const safe = sanitizeReturnUrl(returnUrl, '');
  if (!safe) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}returnUrl=${encodeURIComponent(safe)}`;
}
