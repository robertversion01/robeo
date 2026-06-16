'use client';

import { COOKIE_CONSENT_STORAGE_KEY, type CookieConsentPrefs } from '@/lib/legalConstants';

/**
 * Lokalis, privacy-barat analytics. Anonim session-alapu funnel esemenyek,
 * sajat Supabase-be (POST /api/track) — nincs kulso analytics szolgaltatas.
 * Csak akkor kuld, ha a felhasznalo elfogadta az analytics sutiket (GDPR).
 * Fire-and-forget: soha nem dob hibat, nem blokkolja a UI-t.
 */

const SESSION_KEY = 'robeo_analytics_session';

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function analyticsAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const prefs = JSON.parse(raw) as CookieConsentPrefs;
    return prefs?.analytics === true;
  } catch {
    return false;
  }
}

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !name) return;
  if (!analyticsAllowed()) return;

  const session = getSessionId();
  if (!session) return;

  const payload = {
    events: [
      {
        name,
        props: props ?? {},
        path: window.location?.pathname ?? null,
        session_id: session,
      },
    ],
  };

  try {
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* fire-and-forget */
  }
}

/** Kozos funnel esemeny-nevek — konzisztens elnevezesert. */
export const AnalyticsEvent = {
  SignupCompleted: 'signup_completed',
  ProductView: 'product_view',
  OfferSent: 'offer_sent',
  MessageSent: 'message_sent',
  ListingCreated: 'listing_created',
  FeedbackSubmitted: 'feedback_submitted',
} as const;
