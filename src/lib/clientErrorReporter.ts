'use client';

/**
 * Kliens oldali hibanaplo (lokalis error monitoring, sajat Supabase-be).
 * Operativ adat (uzenet/stack/path/UA), nincs viselkedes-koveteres — ezert
 * nem kotjuk analytics-consenthez. Throttle + dedup, hogy ne floodoljon.
 */

const recent = new Map<string, number>();
const DEDUP_WINDOW_MS = 15_000;
let sent = 0;
const MAX_PER_SESSION = 50;

export function reportClientError(
  message: string,
  options?: { stack?: string; source?: string },
): void {
  if (typeof window === 'undefined') return;
  const msg = (message || '').trim();
  if (!msg) return;
  if (sent >= MAX_PER_SESSION) return;

  const now = Date.now();
  const sig = `${options?.source ?? ''}:${msg}`.slice(0, 200);
  const last = recent.get(sig);
  if (last && now - last < DEDUP_WINDOW_MS) return;
  recent.set(sig, now);
  sent += 1;

  const payload = {
    message: msg.slice(0, 500),
    stack: options?.stack ? options.stack.slice(0, 4000) : undefined,
    source: options?.source,
    path: window.location?.pathname ?? null,
  };

  try {
    void fetch('/api/log/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* fire-and-forget */
  }
}

export function installGlobalErrorMonitor(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onError = (event: ErrorEvent) => {
    reportClientError(event.message || 'window.onerror', {
      stack: event.error?.stack,
      source: 'window',
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'unhandledrejection';
    reportClientError(message, {
      stack: reason instanceof Error ? reason.stack : undefined,
      source: 'unhandledrejection',
    });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
